import { _ as _export_sfc, a as __mf_1, b as __mf_2, c as __mf_18, d as __mf_14, e as __mf_17, f as __mf_15, g as __mf_9, h as __mf_12, i as __mf_19, j as __mf_11, k as __mf_7, l as __mf_4, m as __mf_8, n as __mf_10 } from './_plugin-vue_export-helper-2-5n_a1x.js';

const _hoisted_1 = { class: "subtr-config" };
const _hoisted_2 = { class: "switch-row" };
const _hoisted_3 = { class: "grid-row" };
const _hoisted_4 = { class: "grid-row mt-3" };
const _hoisted_5 = { class: "grid-row mt-3" };
const _hoisted_6 = { class: "grid-row grid-3 mt-3" };
const _hoisted_7 = { class: "grid-row mt-3" };
const _hoisted_8 = { class: "side-switch" };


const _sfc_main = {
  __name: 'Config',
  props: {
  initialConfig: { type: Object, default: () => ({}) },
  api: { type: Object, default: () => ({}) },
},
  emits: ['save', 'close', 'switch'],
  setup(__props, { emit: __emit }) {

const props = __props;

const emit = __emit;

const providerOptions = [
  { title: 'DeepSeek', value: 'deepseek' },
  { title: '硅基流动', value: 'siliconflow' },
  { title: '阿里云百炼', value: 'aliyun' },
  { title: '月之暗面 Kimi', value: 'moonshot' },
  { title: '智谱 BigModel', value: 'zhipu' },
  { title: 'OpenRouter', value: 'openrouter' },
  { title: 'Google Gemini', value: 'gemini' },
  { title: '自定义 OpenAI 兼容', value: 'custom' },
];

const outputOptions = [
  { title: '双语（译文在上、原文在下）', value: 'zh-en' },
  { title: '仅译文', value: 'zh' },
];

const defaults = {
  enabled: false,
  notify: true,
  refresh_server: true,
  provider: 'deepseek',
  api_key: '',
  api_keys: {},
  model: '',
  api_url: '',
  batch_size: 20,
  delay: 0.5,
  retries: 2,
  glossary: '',
  output_mode: 'zh-en',
  overwrite: false,
};

const config = __mf_1({ ...defaults });
const models = __mf_2([]);
const apiKeys = __mf_1({});
const loadingModels = __mf_2(false);
const saving = __mf_2(false);
const showKey = __mf_2(false);
const error = __mf_2('');
const message = __mf_2('');

function unwrap(res) {
  if (!res) return {}
  if (res.data && typeof res.data === 'object' && res.success === undefined) return res.data
  return res
}

async function fetchModels() {
  error.value = '';
  message.value = '';
  loadingModels.value = true;
  try {
    const body = unwrap(await props.api.post('plugin/SubtitleTranslator/models', {
      provider: config.provider,
      api_key: config.api_key,
      api_url: config.api_url,
    }));
    if (body.success === false) {
      error.value = body.message || '拉取失败';
      return
    }
    models.value = body.models || [];
    message.value = body.message || `共 ${models.value.length} 个模型`;
    if (!config.model && models.value.length) {
      config.model = models.value[0];
    }
  } catch (err) {
    error.value = err?.message || '拉取模型失败';
  } finally {
    loadingModels.value = false;
  }
}

async function save() {
  saving.value = true;
  error.value = '';
  message.value = '';
  try {
    emit('save', { ...config, api_keys: { ...apiKeys } });
    message.value = '已保存';
  } catch (err) {
    error.value = err?.message || '保存失败';
  } finally {
    saving.value = false;
  }
}

function onProviderChange() {
  // 切服务商：换回该服务商自己的 Key，并重新拉一次模型
  config.model = '';
  models.value = [];
  config.api_key = apiKeys[config.provider] || '';
  if (config.api_key) fetchModels();
}

__mf_18(() => config.api_key, (value) => {
  if (config.provider) apiKeys[config.provider] = value;
});

__mf_14(async () => {
  Object.keys(defaults).forEach((key) => {
    if (props.initialConfig && props.initialConfig[key] !== undefined) {
      config[key] = props.initialConfig[key];
    }
  });
  const stored = props.initialConfig?.api_keys;
  if (stored && typeof stored === 'object') {
    Object.keys(stored).forEach((key) => { apiKeys[key] = stored[key]; });
  }
  // 老配置只有单一 api_key，归到当前服务商名下
  if (config.api_key && !apiKeys[config.provider]) {
    apiKeys[config.provider] = config.api_key;
  }
  if (config.model) models.value = [config.model];
  if (config.api_key && !config.model) await fetchModels();
});

return (_ctx, _cache) => {
  const _component_v_icon = __mf_17("v-icon");
  const _component_v_card_title = __mf_17("v-card-title");
  const _component_v_card_item = __mf_17("v-card-item");
  const _component_v_alert = __mf_17("v-alert");
  const _component_v_switch = __mf_17("v-switch");
  const _component_v_divider = __mf_17("v-divider");
  const _component_v_select = __mf_17("v-select");
  const _component_v_text_field = __mf_17("v-text-field");
  const _component_v_autocomplete = __mf_17("v-autocomplete");
  const _component_v_btn = __mf_17("v-btn");
  const _component_v_textarea = __mf_17("v-textarea");
  const _component_v_card_text = __mf_17("v-card-text");
  const _component_v_card_actions = __mf_17("v-card-actions");
  const _component_v_card = __mf_17("v-card");

  return (__mf_15(), __mf_9("div", _hoisted_1, [
    __mf_12(_component_v_card, { variant: "outlined" }, {
      default: __mf_19(() => [
        __mf_12(_component_v_card_item, null, {
          default: __mf_19(() => [
            __mf_12(_component_v_card_title, { class: "d-flex align-center" }, {
              default: __mf_19(() => [
                __mf_12(_component_v_icon, {
                  class: "mr-2",
                  color: "primary"
                }, {
                  default: __mf_19(() => [...(_cache[14] || (_cache[14] = [
                    __mf_11("mdi-cog", -1)
                  ]))]),
                  _: 1
                }),
                _cache[15] || (_cache[15] = __mf_11(" 字幕机翻配置 ", -1))
              ]),
              _: 1
            })
          ]),
          _: 1
        }),
        __mf_12(_component_v_card_text, null, {
          default: __mf_19(() => [
            (error.value)
              ? (__mf_15(), __mf_7(_component_v_alert, {
                  key: 0,
                  type: "error",
                  variant: "tonal",
                  density: "compact",
                  class: "mb-3"
                }, {
                  default: __mf_19(() => [
                    __mf_11(__mf_4(error.value), 1)
                  ]),
                  _: 1
                }))
              : __mf_8("", true),
            (message.value)
              ? (__mf_15(), __mf_7(_component_v_alert, {
                  key: 1,
                  type: "success",
                  variant: "tonal",
                  density: "compact",
                  class: "mb-3"
                }, {
                  default: __mf_19(() => [
                    __mf_11(__mf_4(message.value), 1)
                  ]),
                  _: 1
                }))
              : __mf_8("", true),
            __mf_10("div", _hoisted_2, [
              __mf_12(_component_v_switch, {
                modelValue: config.enabled,
                "onUpdate:modelValue": _cache[0] || (_cache[0] = $event => ((config.enabled) = $event)),
                label: "启用插件",
                color: "primary",
                density: "compact",
                "hide-details": "",
                inset: ""
              }, null, 8, ["modelValue"]),
              __mf_12(_component_v_switch, {
                modelValue: config.notify,
                "onUpdate:modelValue": _cache[1] || (_cache[1] = $event => ((config.notify) = $event)),
                label: "完成后通知",
                color: "primary",
                density: "compact",
                "hide-details": "",
                inset: ""
              }, null, 8, ["modelValue"]),
              __mf_12(_component_v_switch, {
                modelValue: config.refresh_server,
                "onUpdate:modelValue": _cache[2] || (_cache[2] = $event => ((config.refresh_server) = $event)),
                label: "写回后刷新媒体服务器",
                color: "primary",
                density: "compact",
                "hide-details": "",
                inset: ""
              }, null, 8, ["modelValue"])
            ]),
            __mf_12(_component_v_divider, { class: "my-4" }),
            __mf_10("div", _hoisted_3, [
              __mf_12(_component_v_select, {
                modelValue: config.provider,
                "onUpdate:modelValue": [
                  _cache[3] || (_cache[3] = $event => ((config.provider) = $event)),
                  onProviderChange
                ],
                items: providerOptions,
                label: "翻译服务商",
                density: "compact",
                variant: "outlined",
                "hide-details": ""
              }, null, 8, ["modelValue"]),
              __mf_12(_component_v_text_field, {
                modelValue: config.api_key,
                "onUpdate:modelValue": _cache[4] || (_cache[4] = $event => ((config.api_key) = $event)),
                label: "API Key",
                placeholder: "sk-...",
                density: "compact",
                variant: "outlined",
                "hide-details": "",
                "append-inner-icon": showKey.value ? 'mdi-eye-off' : 'mdi-eye',
                type: showKey.value ? 'text' : 'password',
                "onClick:appendInner": _cache[5] || (_cache[5] = $event => (showKey.value = !showKey.value))
              }, null, 8, ["modelValue", "append-inner-icon", "type"])
            ]),
            __mf_10("div", _hoisted_4, [
              __mf_12(_component_v_autocomplete, {
                modelValue: config.model,
                "onUpdate:modelValue": _cache[6] || (_cache[6] = $event => ((config.model) = $event)),
                items: models.value,
                loading: loadingModels.value,
                label: "模型",
                placeholder: "点右侧按钮拉取，或直接输入模型名",
                density: "compact",
                variant: "outlined",
                "hide-details": "",
                clearable: "",
                chips: "",
                "closable-chips": "",
                "menu-props": { maxHeight: 320 },
                "no-data-text": "先填 Key 再拉取模型列表"
              }, null, 8, ["modelValue", "items", "loading"]),
              __mf_12(_component_v_btn, {
                color: "secondary",
                variant: "tonal",
                loading: loadingModels.value,
                "prepend-icon": "mdi-cloud-download",
                onClick: fetchModels
              }, {
                default: __mf_19(() => [...(_cache[16] || (_cache[16] = [
                  __mf_11(" 拉取模型 ", -1)
                ]))]),
                _: 1
              }, 8, ["loading"])
            ]),
            __mf_10("div", _hoisted_5, [
              __mf_12(_component_v_text_field, {
                modelValue: config.api_url,
                "onUpdate:modelValue": _cache[7] || (_cache[7] = $event => ((config.api_url) = $event)),
                label: "自定义接口地址（留空用服务商默认）",
                placeholder: "https://api.deepseek.com",
                density: "compact",
                variant: "outlined",
                "hide-details": ""
              }, null, 8, ["modelValue"]),
              __mf_12(_component_v_select, {
                modelValue: config.output_mode,
                "onUpdate:modelValue": _cache[8] || (_cache[8] = $event => ((config.output_mode) = $event)),
                items: outputOptions,
                label: "输出模式",
                density: "compact",
                variant: "outlined",
                "hide-details": ""
              }, null, 8, ["modelValue"])
            ]),
            __mf_10("div", _hoisted_6, [
              __mf_12(_component_v_text_field, {
                modelValue: config.batch_size,
                "onUpdate:modelValue": _cache[9] || (_cache[9] = $event => ((config.batch_size) = $event)),
                modelModifiers: { number: true },
                label: "每批行数",
                type: "number",
                density: "compact",
                variant: "outlined",
                "hide-details": ""
              }, null, 8, ["modelValue"]),
              __mf_12(_component_v_text_field, {
                modelValue: config.delay,
                "onUpdate:modelValue": _cache[10] || (_cache[10] = $event => ((config.delay) = $event)),
                modelModifiers: { number: true },
                label: "批次间隔（秒）",
                type: "number",
                step: "0.5",
                density: "compact",
                variant: "outlined",
                "hide-details": ""
              }, null, 8, ["modelValue"]),
              __mf_12(_component_v_text_field, {
                modelValue: config.retries,
                "onUpdate:modelValue": _cache[11] || (_cache[11] = $event => ((config.retries) = $event)),
                modelModifiers: { number: true },
                label: "失败重试次数",
                type: "number",
                density: "compact",
                variant: "outlined",
                "hide-details": ""
              }, null, 8, ["modelValue"])
            ]),
            __mf_10("div", _hoisted_7, [
              __mf_12(_component_v_textarea, {
                modelValue: config.glossary,
                "onUpdate:modelValue": _cache[12] || (_cache[12] = $event => ((config.glossary) = $event)),
                label: "术语表（每行「原文=译文」，可留空）",
                placeholder: "Sheldon=谢尔顿\nWesteros=维斯特洛",
                rows: "3",
                density: "compact",
                variant: "outlined",
                "hide-details": ""
              }, null, 8, ["modelValue"]),
              __mf_10("div", _hoisted_8, [
                __mf_12(_component_v_switch, {
                  modelValue: config.overwrite,
                  "onUpdate:modelValue": _cache[13] || (_cache[13] = $event => ((config.overwrite) = $event)),
                  label: "覆盖已有中文字幕",
                  color: "warning",
                  density: "compact",
                  "hide-details": "",
                  inset: ""
                }, null, 8, ["modelValue"]),
                _cache[17] || (_cache[17] = __mf_10("div", { class: "hint" }, [
                  __mf_11("默认跳过已有 "),
                  __mf_10("code", null, ".zh.srt"),
                  __mf_11(" 的文件")
                ], -1))
              ])
            ])
          ]),
          _: 1
        }),
        __mf_12(_component_v_card_actions, { class: "px-4 pb-4" }, {
          default: __mf_19(() => [
            __mf_12(_component_v_btn, {
              color: "primary",
              loading: saving.value,
              "prepend-icon": "mdi-content-save",
              onClick: save
            }, {
              default: __mf_19(() => [...(_cache[18] || (_cache[18] = [
                __mf_11("保存", -1)
              ]))]),
              _: 1
            }, 8, ["loading"])
          ]),
          _: 1
        })
      ]),
      _: 1
    })
  ]))
}
}

};
const Config = /*#__PURE__*/_export_sfc(_sfc_main, [['__scopeId',"data-v-b749cde9"]]);

export { Config as default };
