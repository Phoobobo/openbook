import { useState } from 'react';
import {
  DEFAULT_BASE_URL,
  DEFAULT_MODEL,
  clearLlmConfig,
  getLlmConfig,
  setLlmConfig,
} from '../../store/llmConfig';

// 静态部署没有后端，也就没有平台侧的 key。
// 访客要么用演示模式看预置样例，要么填自己的 key 真实生成（只存本地浏览器）。
export default function LlmKeyBar() {
  const [cfg, setCfg] = useState(getLlmConfig);
  const [open, setOpen] = useState(false);
  const [draftKey, setDraftKey] = useState('');
  const [draftModel, setDraftModel] = useState(cfg.model);
  const [draftBaseUrl, setDraftBaseUrl] = useState(cfg.baseUrl);

  const connected = Boolean(cfg.apiKey);

  const save = () => {
    const next = {
      apiKey: draftKey.trim(),
      baseUrl: draftBaseUrl.trim() || DEFAULT_BASE_URL,
      model: draftModel.trim() || DEFAULT_MODEL,
    };
    setLlmConfig(next);
    setCfg(next);
    setDraftKey('');
    setOpen(false);
  };

  const disconnect = () => {
    clearLlmConfig();
    const next = getLlmConfig();
    setCfg(next);
    setDraftModel(next.model);
    setDraftBaseUrl(next.baseUrl);
    setOpen(false);
  };

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        {connected ? (
          <>
            <span className="rounded-full bg-emerald-400/15 px-2.5 py-0.5 text-xs text-emerald-300">
              已连接
            </span>
            <span className="text-white/60">
              自带 key · <span className="text-white/80">{cfg.model}</span>
            </span>
            <div className="ml-auto flex gap-2">
              <button
                onClick={() => setOpen((v) => !v)}
                className="rounded-full border border-white/15 px-3 py-1 text-xs text-white/70 transition hover:text-white"
              >
                修改
              </button>
              <button
                onClick={disconnect}
                className="rounded-full border border-white/15 px-3 py-1 text-xs text-white/70 transition hover:text-white"
              >
                断开
              </button>
            </div>
          </>
        ) : (
          <>
            <span className="rounded-full bg-amber-400/15 px-2.5 py-0.5 text-xs text-amber-300">
              演示模式
            </span>
            <span className="text-white/60">
              点「生成」会返回一篇<span className="text-white/80">预置样例</span>，不调用真实模型
            </span>
            <button
              onClick={() => setOpen((v) => !v)}
              className="ml-auto rounded-full border border-white/15 px-3 py-1 text-xs text-white/70 transition hover:text-white"
            >
              {open ? '收起' : '用我自己的 key 真实生成'}
            </button>
          </>
        )}
      </div>

      {open && (
        <div className="mt-3 flex flex-col gap-2 border-t border-white/10 pt-3">
          <p className="text-xs leading-relaxed text-white/45">
            key 只保存在你自己浏览器的 localStorage，由浏览器直连模型接口，不经过任何服务器。
            OpenRouter 有免费模型，注册后在 openrouter.ai/keys 生成。
          </p>
          <input
            type="password"
            value={draftKey}
            onChange={(e) => setDraftKey(e.target.value)}
            placeholder="粘贴 API key（sk-or-v1-...）"
            className="rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white outline-none placeholder:text-white/30 focus:border-white/35"
          />
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              value={draftModel}
              onChange={(e) => setDraftModel(e.target.value)}
              placeholder={DEFAULT_MODEL}
              className="flex-1 rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-xs text-white outline-none placeholder:text-white/30 focus:border-white/35"
            />
            <input
              value={draftBaseUrl}
              onChange={(e) => setDraftBaseUrl(e.target.value)}
              placeholder={DEFAULT_BASE_URL}
              className="flex-1 rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-xs text-white outline-none placeholder:text-white/30 focus:border-white/35"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={save}
              disabled={!draftKey.trim()}
              className="rounded-full bg-white px-4 py-1.5 text-xs font-medium text-black transition disabled:cursor-not-allowed disabled:opacity-40"
            >
              保存并启用
            </button>
            <button
              onClick={() => setOpen(false)}
              className="rounded-full border border-white/15 px-4 py-1.5 text-xs text-white/70 transition hover:text-white"
            >
              取消
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
