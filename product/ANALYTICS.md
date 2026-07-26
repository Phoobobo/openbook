# OpenBook Phase 0 数据埋点需求

> 状态：产品需求  
> 适用范围：公开阅读 H5、连续阅读节点和渠道分发落地页  
> 对应战略：[`STRATEGY.md`](../STRATEGY.md)

## 1. 目标与边界

Phase 0 的数据系统只回答一个问题：读者是否会在读完一篇高情绪故事后，继续阅读、保存、分享或回来。

因此，埋点必须支持以下决策：

1. 哪个渠道、钩子和内容版本能让读者真正进入阅读？
2. 哪篇故事能够被读完，而不是只被标题点击？
3. 哪个篇尾选择会推动后续阅读？
4. 哪类内容能形成有效情绪触达和 7 日回访？

不在 Phase 0 范围：

- 用户画像推断、广告归因、个性化推荐和创作者收益结算；
- 自由评论文本、私信内容、通讯录、精确地理位置和任何不必要的个人信息；
- 将无法在 Web 端可靠得知的结果伪装成数据，例如把点击“分享”记为“分享成功”。

当前原型把阅读事件保存在浏览器 `localStorage`，仅可用于本地调试。公开读者的结论必须使用本规范规定的可汇总事件，不能混用本地数据。

## 2. 实施原则

### 2.1 数据流

```text
公开阅读页 -> 事件采集接口或分析 SDK -> 原始事件存储 -> 每日内容看板
```

具体选用第一方 `/events` 接口或第三方分析服务均可，但事件名称、字段、口径和验收必须遵守本文件。采集失败不得阻塞阅读、选择、收藏或分享。

### 2.2 匿名身份与会话

| 字段 | 规则 |
|---|---|
| `anonymous_id` | 首次访问生成随机 UUID，第一方 Cookie 或本地持久化保存 180 天；不包含手机号、设备序列号或可逆个人信息 |
| `session_id` | 每次会话生成 UUID；连续 30 分钟无活动后创建新会话 |
| `event_id` | 每条事件生成 UUID；重试时必须保留原值，用于服务端去重 |
| `is_internal` | 内部测试、预发布环境和显式测试链接标记为 `true`，不进入正式看板 |
| `is_returning` | 由服务端或分析层按 `anonymous_id` 的历史会话计算，客户端不得自行猜测 |

未登录不阻碍 Phase 0 验证。匿名身份只用于计算连续阅读与回访；用户清除 Cookie 或跨设备访问被视作新的匿名读者。

### 2.3 渠道与版本归因

所有公开入口必须使用下列参数，采集侧仅保留白名单字段，避免记录无关查询参数：

```text
utm_source       例如 xiaohongshu、douyin、wechat
utm_medium       例如 carousel、video、article、profile
utm_campaign     例如 beijing-season-01
utm_content      例如 qinian-cover-a
utm_term         可选，例如 keyword-reunion
```

每次事件还必须携带 `content_id`、`season_id`、`content_version`、`experiment_id` 和 `variant_id`。内容或文案修改后递增 `content_version`；一次实验只改变一个主要变量。

## 3. 通用事件字段

除事件专有字段外，所有事件必须带以下字段：

| 字段 | 类型 | 说明 |
|---|---|---|
| `event_id` | string | UUID，用于去重 |
| `event_name` | string | 本文件定义的事件名 |
| `occurred_at` | ISO 8601 string | 客户端发生时间，服务端另记接收时间 |
| `anonymous_id` | string | 匿名读者标识 |
| `session_id` | string | 当前会话标识 |
| `content_id` | string | 当前故事 ID |
| `season_id` | string | 当前季 ID，例如 `beijing-s01` |
| `content_version` | string | 故事及阅读页版本，例如 `2026-07-26.1` |
| `experiment_id` | string or null | 实验 ID；没有实验时为 `null` |
| `variant_id` | string or null | 实验分组；没有实验时为 `null` |
| `entry_path` | string | 首次进入的路径，不含查询参数 |
| `utm_*` | string or null | 第 2.3 节定义的归因字段 |
| `platform` | string | `web`、`ios_webview`、`android_webview` 等 |
| `is_internal` | boolean | 是否排除出正式分析 |

不要上传故事正文、用户输入的自由文本、完整 `document.referrer`、IP 地址或 User-Agent 原文。设备和浏览器只保留聚合分析必需的规范化维度。

## 4. Phase 0 必须采集的事件

### 4.1 阅读漏斗

| 事件名 | 触发时机 | 必填专有字段 | 约束 |
|---|---|---|---|
| `reader_session_start` | 公开阅读页加载并可交互 | `landing_type` | 每个会话、每个入口故事一次 |
| `reader_enter` | 读者点击“进入阅读”，或无封面时首屏故事正文可见 | `entry_mode` | 每个会话、每篇故事一次 |
| `story_progress` | 正文阅读进度首次达到 25% 或 75% | `progress_bucket`, `reading_elapsed_ms` | 同一会话、同一故事、同一档位最多一次 |
| `story_complete` | 正文末尾与篇尾行动区连续可见，且阅读进度达到 90% | `reading_elapsed_ms`, `max_progress_pct` | 同一会话、同一故事最多一次 |

`reader_enter` 是完读率的分母。只打开落地页而未开始阅读的用户不计入完读分母，但应保留在进入转化率中。

### 4.2 连续阅读与有效情绪动作

| 事件名 | 触发时机 | 必填专有字段 | 约束 |
|---|---|---|---|
| `next_story_impression` | 篇尾“下一篇你选”模块首次完整可见 | `choice_set_id`, `option_count`, `target_content_ids` | 同一会话、同一篇最多一次 |
| `next_story_select` | 读者点击某个下一篇选项 | `choice_set_id`, `option_id`, `option_rank`, `target_content_id` | 必须发生在对应 `next_story_impression` 之后 |
| `story_save` | 读者收藏或取消收藏 | `saved` | 记录最终动作；本地收藏也要采集 |
| `quote_share_start` | 读者生成分享摘录或调用 Web Share | `share_method`, `quote_id` | 仅代表发起分享，不能命名为 `share_success` |
| `reaction_submit` | 读者提交预设态度反馈 | `reaction_id` | 只接受受控枚举值，不采集自由文本 |

推荐的 `reaction_id` 枚举为：`would_reach_out`、`would_leave`、`felt_seen`、`not_for_me`。产品可新增枚举，但必须同步更新本文件和数据字典。

### 4.3 非核心诊断事件

以下事件不进入北极星指标，但用于判断体验问题：

| 事件名 | 触发时机 | 必填专有字段 |
|---|---|---|
| `audio_toggle` | 打开或关闭 BGM | `enabled`, `source` |
| `reader_error` | 阅读页发生可恢复错误 | `error_code`, `surface` |
| `content_load_failed` | 故事或分支加载失败 | `failure_type`, `target_content_id` |

错误事件必须使用受控 `error_code`，不得上传堆栈、接口响应正文或密钥。

## 5. 指标口径

正式指标均按去重的 `anonymous_id` 计算，排除 `is_internal = true`、预发布环境和明显异常流量。故事、渠道和版本对比时使用同一统计窗口。

| 指标 | 公式 | 用途 |
|---|---|---|
| 进入转化率 | `reader_enter / reader_session_start` | 判断封面、首屏和进入提示 |
| 25% / 75% 到达率 | 对应 `story_progress / reader_enter` | 判断开头与中段流失 |
| 完读率 | `story_complete / reader_enter` | 判断篇幅、节奏和情绪兑现 |
| 下一篇选择率 | `next_story_select / story_complete` | 判断连续阅读与分支后果 |
| 收藏率 | `story_save(saved=true) / story_complete` | 判断内容的长期保存价值 |
| 分享发起率 | `quote_share_start / story_complete` | 判断可转发价值；不等同于真实外部分享 |
| 有效情绪触达率 | `完成且发生至少一次有效动作的读者 / reader_enter` | Phase 0 北极星指标 |
| 7 日主动回访率 | 首次进入后第 1-7 天有新 `reader_session_start` 的读者 / 首次进入读者 | 判断内容网络与回访价值 |

有效动作仅包括 `next_story_select`、`story_save(saved=true)`、`quote_share_start`、`reaction_submit`。一次会话内同一读者命中多项动作只计一次。

## 6. 看板与决策节奏

每日看板至少按以下维度可筛选：

- `season_id`、`content_id`、`content_version`；
- `utm_source`、`utm_medium`、`utm_campaign`、`utm_content`；
- `experiment_id`、`variant_id`；
- 新读者与回访读者。

每周对每篇故事输出一张内容卡：进入转化、25%/75% 到达、完读、下一篇选择、收藏、分享发起、有效情绪触达、各分支流向和错误率。

在累计至少 300 位去重 `reader_enter` 后，按下列初始门槛决策：

| 指标 | 门槛 | 下一步 |
|---|---:|---|
| 完读率 | >= 60% | 低于门槛，先重做钩子、篇幅或节奏 |
| 下一篇选择率 | >= 15% | 低于门槛，重做篇尾关系后果和节点连接 |
| 收藏或分享发起率 | >= 5% | 低于门槛，检查情绪峰值和可摘录语句 |
| 7 日主动回访率 | >= 8% | 低于门槛，检查季节内容密度与回访动机 |

这些数值是当前产品假设的通过线，不是对外宣称的行业基准。达到分享而未达到选择和回访时，优先把 OpenBook 作为内容厂牌运营；选择和回访同时达到门槛后，才进入轻量身份与阅读路径推荐的 Phase 1。

## 7. 数据质量与发布验收

每次公开阅读页或内容版本发布前，必须完成下列验收：

1. 使用带完整 UTM 的测试链接进入，验证 `reader_session_start` 中的归因字段与内容版本正确。
2. 点击进入并阅读至 25%、75%、篇尾，验证事件顺序、时间和进度档位正确，且每个档位不重复上报。
3. 点击每个下一篇选项，验证 `next_story_select.target_content_id` 与实际打开的故事一致。
4. 收藏、取消收藏、生成分享摘录、调用分享和提交态度反馈，验证事件字段符合枚举约束。
5. 刷新页面、断网重试和重新进入，验证 `event_id` 去重，且采集失败不影响阅读流程。
6. 确认测试流量标记为 `is_internal = true`，不会污染正式看板。
7. 复核采集载荷不包含正文、自由文本、完整 Referrer、密钥或可识别个人信息。

事件发送优先采用 `navigator.sendBeacon` 或非阻塞请求；页面卸载时应尽力发送已排队事件，但不能因此延迟跳转或卡住界面。

## 8. 延后到 Phase 1 的能力

- 登录账户与跨设备合并；
- 浏览器无法确认的外部分享成功回传；
- 创作者侧收入、素材采纳、版本协作和内容审核指标；
- 基于阅读路径的个性化推荐；
- 评论、私信和任何自由文本互动。

在这些能力进入排期前，必须先确认本规范中的完读、选择和回访门槛已被真实读者数据支持。
