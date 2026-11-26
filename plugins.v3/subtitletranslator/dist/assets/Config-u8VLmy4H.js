import { _ as _export_sfc, a as __mf_1, b as __mf_2, c as __mf_7, d as __mf_19, e as __mf_15, f as __mf_18, g as __mf_16, h as __mf_10, i as __mf_11, j as __mf_13, k as __mf_12, l as __mf_9, m as __mf_20, n as __mf_8, o as __mf_5, p as __mf_4, q as __mf_6, r as __mf_17, s as __mf_3 } from './_plugin-vue_export-helper-LVYZPD0I.js';

const _hoisted_1 = { class: "cfg" };
const _hoisted_2 = { class: "cfg-head" };
const _hoisted_3 = { class: "cfg-brand" };
const _hoisted_4 = { class: "cfg-logo" };
const _hoisted_5 = { class: "cfg-actions" };
const _hoisted_6 = {
  key: 0,
  class: "cfg-dirty"
};
const _hoisted_7 = { class: "cfg-body" };
const _hoisted_8 = { class: "cfg-nav" };
const _hoisted_9 = ["onClick"];
const _hoisted_10 = { class: "nav-label" };
const _hoisted_11 = { class: "nav-sub" };
const _hoisted_12 = { class: "cfg-content" };
const _hoisted_13 = { class: "switch-row" };
const _hoisted_14 = { class: "grid-2" };
const _hoisted_15 = { class: "grid-3" };
const _hoisted_16 = { class: "panel-head panel-head--row" };
const _hoisted_17 = { class: "panel-title" };
const _hoisted_18 = { class: "panel-desc" };
const _hoisted_19 = { class: "grid-2" };
const _hoisted_20 = { class: "model-row mt-3" };
const _hoisted_21 = { class: "provider-status mt-3" };


const _sfc_main = {
  __name: 'Config',
  props: {
  initialConfig: { type: Object, default: () => ({}) },
  api: { type: Object, default: () => ({}) },
},
  emits: ['save', 'layout', 'close', 'switch'],
  setup(__props, { emit: __emit }) {

const props = __props;

const emit = __emit;

const PROVIDERS = [
  { key: 'deepseek', name: 'DeepSeek', icon: 'mdi-robot-outline', hint: '官方接口，字幕翻译性价比高，默认关闭思考模式。' },
  { key: 'siliconflow', name: '硅基流动', icon: 'mdi-cloud-outline', hint: '国内聚合平台，模型选择多。' },
  { key: 'aliyun', name: '阿里云百炼', icon: 'mdi-cloud-braces', hint: 'DashScope 兼容模式，qwen 系列。' },
  { key: 'moonshot', name: '月之暗面 Kimi', icon: 'mdi-moon-waning-crescent', hint: 'Kimi 长上下文，适合长片字幕。' },
  { key: 'zhipu', name: '智谱 BigModel', icon: 'mdi-lightning-bolt-outline', hint: 'GLM 系列，速度快。' },
  { key: 'openrouter', name: 'OpenRouter', icon: 'mdi-routes', hint: '聚合多家模型，需要代理时在系统里配置。' },
  { key: 'gemini', name: 'Google Gemini', icon: 'mdi-google', hint: '原生接口，国内访问通常需要代理。' },
  { key: 'custom', name: '自定义（OpenAI 兼容）', icon: 'mdi-server', hint: '任意兼容 OpenAI 的服务，如自建网关、Ollama。' },
];

const providerOptions = PROVIDERS.map(item => ({ title: item.name, value: item.key }));
const outputOptions = [
  { title: '双语（译文在上、原文在下）', value: 'zh-en' },
  { title: '仅译文', value: 'zh' },
];

const defaults = {
  enabled: false,
  notify: true,
  refresh_server: true,
  overwrite: false,
  output_mode: 'zh-en',
  provider: 'deepseek',
  batch_size: 20,
  delay: 0.5,
  retries: 2,
  glossary: '',
  api_key: '',
  model: '',
  api_url: '',
};

const config = __mf_1({ ...defaults });
const apiKeys = __mf_1({});
const modelsMap = __mf_1({});
const providerUrls = __mf_1({});
const models = __mf_2([]);
const active = __mf_2('global');
const showKey = __mf_2(false);
const loadingModels = __mf_2(false);
const testing = __mf_2(false);
const saving = __mf_2(false);
const error = __mf_2('');
const message = __mf_2('');
const snapshot = __mf_2('');

const providerList = __mf_7(() => PROVIDERS);
const activeProvider = __mf_7(() => PROVIDERS.find(item => item.key === active.value) || null);

const activeKey = __mf_7({
  get: () => apiKeys[active.value] || '',
  set: (value) => { apiKeys[active.value] = value; },
});
const activeModel = __mf_7({
  get: () => modelsMap[active.value] || '',
  set: (value) => { modelsMap[active.value] = value || ''; },
});
const activeUrl = __mf_7({
  get: () => providerUrls[active.value] || '',
  set: (value) => { providerUrls[active.value] = value || ''; },
});
const modelOptions = __mf_7(() => {
  const current = modelsMap[active.value];
  const list = models.value.slice();
  if (current && !list.includes(current)) list.unshift(current);
  return list
});

function unwrap(res) {
  if (!res) return {}
  if (res.data && typeof res.data === 'object' && res.success === undefined) return res.data
  return res
}

function payload() {
  const provider = config.provider;
  return {
    ...config,
    api_key: apiKeys[provider] || '',
    model: modelsMap[provider] || '',
    api_keys: { ...apiKeys },
    models: { ...modelsMap },
    provider_urls: { ...providerUrls },
  }
}

function refreshSnapshot() {
  snapshot.value = JSON.stringify(payload());
}

const dirty = __mf_7(() => JSON.stringify(payload()) !== snapshot.value);

async function fetchModels() {
  error.value = '';
  message.value = '';
  loadingModels.value = true;
  try {
    const body = unwrap(await props.api.post('plugin/SubtitleTranslator/models', {
      provider: active.value,
      api_key: activeKey.value,
      api_url: activeUrl.value,
    }));
    if (body.success === false) {
      error.value = body.message || '拉取失败';
      return
    }
    models.value = body.models || [];
    message.value = body.message || `共 ${models.value.length} 个模型`;
    if (!modelsMap[active.value] && models.value.length) modelsMap[active.value] = models.value[0];
  } catch (err) {
    error.value = err?.message || '拉取模型失败';
  } finally {
    loadingModels.value = false;
  }
}

async function testProvider() {
  error.value = '';
  message.value = '';
  testing.value = true;
  try {
    const body = unwrap(await props.api.post('plugin/SubtitleTranslator/models', {
      provider: active.value,
      api_key: activeKey.value,
      api_url: activeUrl.value,
    }));
    if (body.success === false) {
      error.value = `${activeProvider.value.name} 验证失败：${body.message || '未知原因'}`;
    } else {
      message.value = `${activeProvider.value.name} 可用，返回 ${body.models?.length || 0} 个模型`;
    }
  } catch (err) {
    error.value = err?.message || '验证失败';
  } finally {
    testing.value = false;
  }
}

function clearProvider() {
  apiKeys[active.value] = '';
  modelsMap[active.value] = '';
  providerUrls[active.value] = '';
  models.value = [];
  if (config.provider === active.value) {
    config.enabled = config.enabled;
  }
  message.value = `已清除 ${activeProvider.value.name} 的配置（保存后生效）`;
}

async function save() {
  saving.value = true;
  error.value = '';
  message.value = '';
  try {
    emit('save', payload());
    snapshot.value = JSON.stringify(payload());
    message.value = '已保存';
  } catch (err) {
    error.value = err?.message || '保存失败';
  } finally {
    saving.value = false;
  }
}

function loadFrom(conf) {
  Object.keys(defaults).forEach((key) => {
    if (conf && conf[key] !== undefined) config[key] = conf[key];
  });
  const keys = conf?.api_keys;
  if (keys && typeof keys === 'object') Object.keys(keys).forEach((k) => { apiKeys[k] = keys[k]; });
  if (conf?.api_key && !apiKeys[config.provider]) apiKeys[config.provider] = conf.api_key;

  const saved = conf?.models;
  if (saved && typeof saved === 'object') Object.keys(saved).forEach((k) => { modelsMap[k] = saved[k]; });
  if (conf?.model && !modelsMap[config.provider]) modelsMap[config.provider] = conf.model;

  const urls = conf?.provider_urls;
  if (urls && typeof urls === 'object') Object.keys(urls).forEach((k) => { providerUrls[k] = urls[k]; });
  if (conf?.api_url && !providerUrls[config.provider]) providerUrls[config.provider] = conf.api_url;
}

__mf_19(active, () => {
  models.value = modelsMap[active.value] ? [modelsMap[active.value]] : [];
  error.value = '';
  message.value = '';
});

__mf_15(() => {
  loadFrom(props.initialConfig || {});
  refreshSnapshot();
});

return (_ctx, _cache) => {
  const _component_v_icon = __mf_18("v-icon");
  const _component_v_btn = __mf_18("v-btn");
  const _component_v_alert = __mf_18("v-alert");
  const _component_v_chip = __mf_18("v-chip");
  const _component_v_switch = __mf_18("v-switch");
  const _component_v_select = __mf_18("v-select");
  const _component_v_text_field = __mf_18("v-text-field");
  const _component_v_textarea = __mf_18("v-textarea");
  const _component_v_autocomplete = __mf_18("v-autocomplete");

  return (__mf_16(), __mf_10("section", _hoisted_1, [
    __mf_11("header", _hoisted_2, [
      __mf_11("div", _hoisted_3, [
        __mf_11("div", _hoisted_4, [
          __mf_13(_component_v_icon, {
            icon: "mdi-subtitles-outline",
            size: "20"
          })
        ]),
        _cache[17] || (_cache[17] = __mf_11("div", null, [
          __mf_11("div", { class: "cfg-crumb" }, "MoviePilot · 插件"),
          __mf_11("h1", { class: "cfg-title" }, "字幕机翻 · 设置")
        ], -1))
      ]),
      __mf_11("div", _hoisted_5, [
        (dirty.value)
          ? (__mf_16(), __mf_10("span", _hoisted_6, [
              __mf_13(_component_v_icon, {
                icon: "mdi-circle",
                size: "8",
                color: "warning"
              }),
              _cache[18] || (_cache[18] = __mf_12(" 有未保存的修改", -1))
            ]))
          : __mf_9("", true),
        __mf_13(_component_v_btn, {
          color: "primary",
          variant: "flat",
          loading: saving.value,
          onClick: save
        }, {
          default: __mf_20(() => [
            __mf_13(_component_v_icon, {
              icon: "mdi-content-save-outline",
              start: ""
            }),
            _cache[19] || (_cache[19] = __mf_12("保存 ", -1))
          ]),
          _: 1
        }, 8, ["loading"]),
        __mf_13(_component_v_btn, {
          icon: "mdi-close",
          size: "small",
          variant: "text",
          "aria-label": '关闭',
          onClick: _cache[0] || (_cache[0] = $event => (emit('close')))
        })
      ])
    ]),
    (error.value)
      ? (__mf_16(), __mf_8(_component_v_alert, {
          key: 0,
          type: "error",
          variant: "tonal",
          density: "compact",
          class: "mx-4 mb-0"
        }, {
          default: __mf_20(() => [
            __mf_12(__mf_5(error.value), 1)
          ]),
          _: 1
        }))
      : __mf_9("", true),
    (message.value)
      ? (__mf_16(), __mf_8(_component_v_alert, {
          key: 1,
          type: "success",
          variant: "tonal",
          density: "compact",
          class: "mx-4 mb-0"
        }, {
          default: __mf_20(() => [
            __mf_12(__mf_5(message.value), 1)
          ]),
          _: 1
        }))
      : __mf_9("", true),
    __mf_11("div", _hoisted_7, [
      __mf_11("nav", _hoisted_8, [
        __mf_11("button", {
          type: "button",
          class: __mf_4(["nav-item", { 'nav-item--active': active.value === 'global' }]),
          onClick: _cache[1] || (_cache[1] = $event => (active.value = 'global'))
        }, [
          __mf_13(_component_v_icon, {
            icon: "mdi-cog-outline",
            size: "18"
          }),
          _cache[20] || (_cache[20] = __mf_11("span", { class: "nav-label" }, "全局设置", -1))
        ], 2),
        _cache[22] || (_cache[22] = __mf_11("div", { class: "nav-heading" }, "翻译服务商", -1)),
        (__mf_16(true), __mf_10(__mf_6, null, __mf_17(providerList.value, (provider) => {
          return (__mf_16(), __mf_10("button", {
            key: provider.key,
            type: "button",
            class: __mf_4(["nav-item", { 'nav-item--active': active.value === provider.key }]),
            onClick: $event => (active.value = provider.key)
          }, [
            __mf_11("span", {
              class: __mf_4(["nav-dot", { 'nav-dot--on': !!apiKeys[provider.key] }])
            }, null, 2),
            __mf_11("span", _hoisted_10, __mf_5(provider.name), 1),
            (config.provider === provider.key)
              ? (__mf_16(), __mf_8(_component_v_chip, {
                  key: 0,
                  size: "x-small",
                  variant: "tonal",
                  class: "nav-current"
                }, {
                  default: __mf_20(() => [...(_cache[21] || (_cache[21] = [
                    __mf_12("当前", -1)
                  ]))]),
                  _: 1
                }))
              : __mf_9("", true),
            __mf_11("span", _hoisted_11, __mf_5(modelsMap[provider.key] || '未配置'), 1)
          ], 10, _hoisted_9))
        }), 128))
      ]),
      __mf_11("div", _hoisted_12, [
        (active.value === 'global')
          ? (__mf_16(), __mf_10(__mf_6, { key: 0 }, [
              _cache[24] || (_cache[24] = __mf_11("div", { class: "panel-head" }, [
                __mf_11("h2", { class: "panel-title" }, "全局设置"),
                __mf_11("p", { class: "panel-desc" }, "任务行为与翻译输出格式；服务商相关的密钥与模型在左侧逐个维护。")
              ], -1)),
              __mf_11("div", _hoisted_13, [
                __mf_13(_component_v_switch, {
                  modelValue: config.enabled,
                  "onUpdate:modelValue": _cache[2] || (_cache[2] = $event => ((config.enabled) = $event)),
                  label: "启用插件",
                  color: "primary",
                  density: "compact",
                  "hide-details": "",
                  inset: ""
                }, null, 8, ["modelValue"]),
                __mf_13(_component_v_switch, {
                  modelValue: config.notify,
                  "onUpdate:modelValue": _cache[3] || (_cache[3] = $event => ((config.notify) = $event)),
                  label: "完成后通知",
                  color: "primary",
                  density: "compact",
                  "hide-details": "",
                  inset: ""
                }, null, 8, ["modelValue"]),
                __mf_13(_component_v_switch, {
                  modelValue: config.refresh_server,
                  "onUpdate:modelValue": _cache[4] || (_cache[4] = $event => ((config.refresh_server) = $event)),
                  label: "写回后刷新媒体服务器",
                  color: "primary",
                  density: "compact",
                  "hide-details": "",
                  inset: ""
                }, null, 8, ["modelValue"]),
                __mf_13(_component_v_switch, {
                  modelValue: config.overwrite,
                  "onUpdate:modelValue": _cache[5] || (_cache[5] = $event => ((config.overwrite) = $event)),
                  label: "总是重翻已有中文字幕",
                  color: "warning",
                  density: "compact",
                  "hide-details": "",
                  inset: ""
                }, null, 8, ["modelValue"])
              ]),
              __mf_11("div", _hoisted_14, [
                __mf_13(_component_v_select, {
                  modelValue: config.output_mode,
                  "onUpdate:modelValue": _cache[6] || (_cache[6] = $event => ((config.output_mode) = $event)),
                  items: outputOptions,
                  label: "输出模式",
                  density: "compact",
                  variant: "outlined",
                  "hide-details": ""
                }, null, 8, ["modelValue"]),
                __mf_13(_component_v_select, {
                  modelValue: config.provider,
                  "onUpdate:modelValue": _cache[7] || (_cache[7] = $event => ((config.provider) = $event)),
                  items: __mf_3(providerOptions),
                  label: "当前使用的服务商",
                  density: "compact",
                  variant: "outlined",
                  "hide-details": ""
                }, null, 8, ["modelValue", "items"])
              ]),
              __mf_11("div", _hoisted_15, [
                __mf_13(_component_v_text_field, {
                  modelValue: config.batch_size,
                  "onUpdate:modelValue": _cache[8] || (_cache[8] = $event => ((config.batch_size) = $event)),
                  modelModifiers: { number: true },
                  label: "每批行数",
                  type: "number",
                  density: "compact",
                  variant: "outlined",
                  "hide-details": ""
                }, null, 8, ["modelValue"]),
                __mf_13(_component_v_text_field, {
                  modelValue: config.delay,
                  "onUpdate:modelValue": _cache[9] || (_cache[9] = $event => ((config.delay) = $event)),
                  modelModifiers: { number: true },
                  label: "批次间隔（秒）",
                  type: "number",
                  step: "0.5",
                  density: "compact",
                  variant: "outlined",
                  "hide-details": ""
                }, null, 8, ["modelValue"]),
                __mf_13(_component_v_text_field, {
                  modelValue: config.retries,
                  "onUpdate:modelValue": _cache[10] || (_cache[10] = $event => ((config.retries) = $event)),
                  modelModifiers: { number: true },
                  label: "失败重试次数",
                  type: "number",
                  density: "compact",
                  variant: "outlined",
                  "hide-details": ""
                }, null, 8, ["modelValue"])
              ]),
              __mf_13(_component_v_textarea, {
                modelValue: config.glossary,
                "onUpdate:modelValue": _cache[11] || (_cache[11] = $event => ((config.glossary) = $event)),
                label: "术语表（每行「原文=译文」，可留空）",
                placeholder: "Sheldon=谢尔顿\nWesteros=维斯特洛",
                rows: "4",
                density: "compact",
                variant: "outlined",
                "hide-details": "",
                class: "mt-3"
              }, null, 8, ["modelValue"]),
              __mf_13(_component_v_alert, {
                type: "info",
                variant: "tonal",
                density: "compact",
                class: "mt-4"
              }, {
                default: __mf_20(() => [...(_cache[23] || (_cache[23] = [
                  __mf_12(" 切换「当前使用的服务商」后，翻译会使用该服务商下维护的密钥与模型。 ", -1)
                ]))]),
                _: 1
              })
            ], 64))
          : (activeProvider.value)
            ? (__mf_16(), __mf_10(__mf_6, { key: 1 }, [
                __mf_11("div", _hoisted_16, [
                  __mf_11("div", null, [
                    __mf_11("h2", _hoisted_17, [
                      __mf_13(_component_v_icon, {
                        icon: activeProvider.value.icon,
                        size: "20",
                        class: "mr-2"
                      }, null, 8, ["icon"]),
                      __mf_12(__mf_5(activeProvider.value.name), 1)
                    ]),
                    __mf_11("p", _hoisted_18, __mf_5(activeProvider.value.hint), 1)
                  ]),
                  (config.provider !== activeProvider.value.key)
                    ? (__mf_16(), __mf_8(_component_v_btn, {
                        key: 0,
                        size: "small",
                        variant: "tonal",
                        color: "primary",
                        "prepend-icon": "mdi-check-circle-outline",
                        onClick: _cache[12] || (_cache[12] = $event => (config.provider = activeProvider.value.key))
                      }, {
                        default: __mf_20(() => [...(_cache[25] || (_cache[25] = [
                          __mf_12(" 设为当前 ", -1)
                        ]))]),
                        _: 1
                      }))
                    : (__mf_16(), __mf_8(_component_v_chip, {
                        key: 1,
                        size: "small",
                        color: "primary",
                        variant: "flat"
                      }, {
                        default: __mf_20(() => [...(_cache[26] || (_cache[26] = [
                          __mf_12("当前使用中", -1)
                        ]))]),
                        _: 1
                      }))
                ]),
                __mf_11("div", _hoisted_19, [
                  __mf_13(_component_v_text_field, {
                    modelValue: activeKey.value,
                    "onUpdate:modelValue": _cache[13] || (_cache[13] = $event => ((activeKey).value = $event)),
                    label: activeProvider.value.key === 'custom' ? 'API Key（可留空）' : 'API Key',
                    placeholder: "sk-...",
                    density: "compact",
                    variant: "outlined",
                    "hide-details": "",
                    type: showKey.value ? 'text' : 'password',
                    "append-inner-icon": showKey.value ? 'mdi-eye-off' : 'mdi-eye',
                    "onClick:appendInner": _cache[14] || (_cache[14] = $event => (showKey.value = !showKey.value))
                  }, null, 8, ["modelValue", "label", "type", "append-inner-icon"]),
                  __mf_13(_component_v_text_field, {
                    modelValue: activeUrl.value,
                    "onUpdate:modelValue": _cache[15] || (_cache[15] = $event => ((activeUrl).value = $event)),
                    label: "接口地址（留空用服务商默认）",
                    placeholder: "https://api.deepseek.com",
                    density: "compact",
                    variant: "outlined",
                    "hide-details": ""
                  }, null, 8, ["modelValue"])
                ]),
                __mf_11("div", _hoisted_20, [
                  __mf_13(_component_v_autocomplete, {
                    modelValue: activeModel.value,
                    "onUpdate:modelValue": _cache[16] || (_cache[16] = $event => ((activeModel).value = $event)),
                    items: modelOptions.value,
                    loading: loadingModels.value,
                    label: "模型",
                    placeholder: "点「拉取模型」获取，或直接输入",
                    density: "compact",
                    variant: "outlined",
                    "hide-details": "",
                    clearable: "",
                    "closable-chips": "",
                    "menu-props": { maxHeight: 320 },
                    "no-data-text": "先填 Key 再拉取模型列表"
                  }, null, 8, ["modelValue", "items", "loading"]),
                  __mf_13(_component_v_btn, {
                    color: "secondary",
                    variant: "tonal",
                    loading: loadingModels.value,
                    "prepend-icon": "mdi-cloud-download-outline",
                    onClick: fetchModels
                  }, {
                    default: __mf_20(() => [...(_cache[27] || (_cache[27] = [
                      __mf_12(" 拉取模型 ", -1)
                    ]))]),
                    _: 1
                  }, 8, ["loading"]),
                  __mf_13(_component_v_btn, {
                    variant: "text",
                    disabled: !activeKey.value && activeProvider.value.key !== 'custom',
                    "prepend-icon": "mdi-connection",
                    loading: testing.value,
                    onClick: testProvider
                  }, {
                    default: __mf_20(() => [...(_cache[28] || (_cache[28] = [
                      __mf_12(" 验证 ", -1)
                    ]))]),
                    _: 1
                  }, 8, ["disabled", "loading"])
                ]),
                __mf_11("div", _hoisted_21, [
                  __mf_13(_component_v_chip, {
                    size: "small",
                    color: apiKeys[activeProvider.value.key] ? 'success' : 'grey',
                    variant: "tonal"
                  }, {
                    default: __mf_20(() => [
                      __mf_12(__mf_5(apiKeys[activeProvider.value.key] ? '已配置密钥' : '未配置密钥'), 1)
                    ]),
                    _: 1
                  }, 8, ["color"]),
                  (modelsMap[activeProvider.value.key])
                    ? (__mf_16(), __mf_8(_component_v_chip, {
                        key: 0,
                        size: "small",
                        variant: "tonal"
                      }, {
                        default: __mf_20(() => [
                          __mf_12(" 模型：" + __mf_5(modelsMap[activeProvider.value.key]), 1)
                        ]),
                        _: 1
                      }))
                    : __mf_9("", true),
                  (apiKeys[activeProvider.value.key])
                    ? (__mf_16(), __mf_8(_component_v_btn, {
                        key: 1,
                        size: "small",
                        variant: "text",
                        color: "error",
                        onClick: clearProvider
                      }, {
                        default: __mf_20(() => [...(_cache[29] || (_cache[29] = [
                          __mf_12(" 清除该服务商配置 ", -1)
                        ]))]),
                        _: 1
                      }))
                    : __mf_9("", true)
                ]),
                (activeProvider.value.key === 'gemini')
                  ? (__mf_16(), __mf_8(_component_v_alert, {
                      key: 0,
                      type: "info",
                      variant: "tonal",
                      density: "compact",
                      class: "mt-4"
                    }, {
                      default: __mf_20(() => [...(_cache[30] || (_cache[30] = [
                        __mf_12(" Gemini 走原生接口，模型名形如 ", -1),
                        __mf_11("code", null, "gemini-2.5-flash", -1),
                        __mf_12("。 ", -1)
                      ]))]),
                      _: 1
                    }))
                  : (activeProvider.value.key === 'custom')
                    ? (__mf_16(), __mf_8(_component_v_alert, {
                        key: 1,
                        type: "info",
                        variant: "tonal",
                        density: "compact",
                        class: "mt-4"
                      }, {
                        default: __mf_20(() => [...(_cache[31] || (_cache[31] = [
                          __mf_12(" 自定义服务商需兼容 OpenAI 的 ", -1),
                          __mf_11("code", null, "/chat/completions", -1),
                          __mf_12(" 接口；接口地址要填到 ", -1),
                          __mf_11("code", null, "/v1", -1),
                          __mf_12(" 这一层。 ", -1)
                        ]))]),
                        _: 1
                      }))
                    : __mf_9("", true)
              ], 64))
            : __mf_9("", true)
      ])
    ])
  ]))
}
}

};
const Config = /*#__PURE__*/_export_sfc(_sfc_main, [['__scopeId',"data-v-3b6ca46d"]]);

export { Config as default };
