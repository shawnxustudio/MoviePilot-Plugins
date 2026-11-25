import { _ as _export_sfc, b as __mf_2, o as __mf_6, d as __mf_14, p as __mf_13, e as __mf_17, f as __mf_15, g as __mf_9, h as __mf_12, i as __mf_19, n as __mf_10, k as __mf_7, j as __mf_11, m as __mf_8, l as __mf_4, q as __mf_5, r as __mf_16, s as __mf_3, t as __mf_0 } from './_plugin-vue_export-helper-2-5n_a1x.js';

const _hoisted_1 = { class: "subtr-page" };
const _hoisted_2 = { class: "head-row" };
const _hoisted_3 = {
  key: 0,
  class: "task-strip mb-3"
};
const _hoisted_4 = { class: "task-head" };
const _hoisted_5 = { class: "task-title" };
const _hoisted_6 = { class: "stage-row" };
const _hoisted_7 = { class: "task-meta" };
const _hoisted_8 = { class: "task-file" };
const _hoisted_9 = { key: 0 };
const _hoisted_10 = { key: 1 };
const _hoisted_11 = { key: 2 };
const _hoisted_12 = { key: 3 };
const _hoisted_13 = {
  key: 0,
  class: "queue-line"
};
const _hoisted_14 = { class: "toolbar" };
const _hoisted_15 = { class: "section-line" };
const _hoisted_16 = { class: "section-title" };
const _hoisted_17 = { class: "section-count" };
const _hoisted_18 = {
  key: 3,
  class: "skeleton-grid"
};
const _hoisted_19 = {
  key: 4,
  class: "result-grid"
};
const _hoisted_20 = { class: "poster-wrap" };
const _hoisted_21 = {
  key: 1,
  class: "poster-fallback"
};
const _hoisted_22 = {
  key: 2,
  class: "type-badge"
};
const _hoisted_23 = { class: "card-body" };
const _hoisted_24 = ["title"];
const _hoisted_25 = { class: "meta-line" };
const _hoisted_26 = { key: 0 };
const _hoisted_27 = { key: 1 };
const _hoisted_28 = { class: "chip-line" };
const _hoisted_29 = { class: "card-actions" };
const _hoisted_30 = {
  key: 5,
  class: "empty-tip"
};
const _hoisted_31 = {
  key: 2,
  class: "d-flex justify-center pa-6"
};
const _hoisted_32 = {
  key: 4,
  class: "force-row"
};
const _hoisted_33 = { class: "track-label" };
const _hoisted_34 = {
  key: 0,
  class: "track-title"
};
const _hoisted_35 = {
  key: 0,
  class: "text-caption opacity-70"
};
const _hoisted_36 = { class: "started-head" };
const _hoisted_37 = { class: "eta-line" };
const _hoisted_38 = {
  key: 0,
  class: "queue-hint"
};
const _hoisted_39 = {
  key: 1,
  class: "live-box"
};
const _hoisted_40 = { class: "live-row live-stage" };
const _hoisted_41 = { class: "stage-text" };
const _hoisted_42 = { class: "live-row" };
const _hoisted_43 = { class: "live-file" };
const _hoisted_44 = { key: 0 };
const _hoisted_45 = { class: "live-row" };
const _hoisted_46 = { key: 0 };
const _hoisted_47 = { key: 1 };
const _hoisted_48 = { key: 2 };
const _hoisted_49 = { class: "history-title" };
const _hoisted_50 = { class: "history-meta" };
const _hoisted_51 = { class: "history-time" };
const _hoisted_52 = {
  key: 0,
  class: "empty-tip"
};


const _sfc_main = {
  __name: 'Page',
  props: {
  model: { type: Object, default: () => ({}) },
  api: { type: Object, default: () => ({}) },
  pluginId: { type: String, default: '' },
  // 宿主允许页面切到配置页时传 true，保持与官方插件一致的行为
  show_switch: { type: Boolean, default: true },
},
  emits: ['action', 'switch', 'close'],
  setup(__props, { emit: __emit }) {

const props = __props;

const emit = __emit;

const q = __mf_2('');
const type = __mf_2('all');
const typeOptions = [
  { title: '全部', value: 'all' },
  { title: '电影', value: 'Movie' },
  { title: '剧集', value: 'Series' },
];

const items = __mf_2([]);
const searching = __mf_2(false);
const searched = __mf_2(false);
const error = __mf_2('');

const current = __mf_2(null);
const queue = __mf_2([]);
const history = __mf_2([]);
const lastResult = __mf_2(null);
const showHistory = __mf_2(false);

const startedDialog = __mf_2(false);
const startedInfo = __mf_2(null);

const probeDialog = __mf_2(false);
const probeItem = __mf_2(null);
const probeStreams = __mf_2([]);
const probeVideo = __mf_2('');
const probeMessage = __mf_2('');
const probeError = __mf_2('');
const probeLoading = __mf_2(false);
const selectedTrack = __mf_2(-1);
const probeExisting = __mf_2(0);
const probeFiles = __mf_2(1);
const forceRetranslate = __mf_2(true);
const starting = __mf_2(false);

let timer = null;
let hadTask = false;

const stageList = [
  { key: 'extract', label: '提取字幕' },
  { key: 'translate', label: '翻译字幕' },
  { key: 'write', label: '写入字幕' },
  { key: 'refresh', label: '刷新媒体库' },
];

const stageIndex = __mf_6(() => {
  const stage = current.value?.stage || '';
  if (stage === 'refresh' || stage === 'done') return 3
  if (stage === 'write') return 2
  if (stage === 'translate') return 1
  if (stage === 'extract') return 0
  return -1
});

const stageText = __mf_6(() => {
  const stage = current.value?.stage || '';
  const label = {
    queued: '排队中',
    prepare: '准备文件',
    probe: '探测字幕轨',
    extract: '正在提取字幕',
    translate: '正在翻译字幕',
    write: '正在写入字幕',
    refresh: '正在刷新媒体库',
    done: '已完成',
  }[stage];
  return label || '准备中…'
});

const runningThis = __mf_6(() => {
  const info = startedInfo.value;
  const task = current.value;
  return !!(info && task && info.task_id && task.id === info.task_id)
});

const finishClock = __mf_6(() => {
  const info = startedInfo.value;
  if (!info || !info.eta_high) return ''
  const at = new Date(Date.now() + info.eta_high * 60 * 1000);
  return `${String(at.getHours()).padStart(2, '0')}:${String(at.getMinutes()).padStart(2, '0')}`
});

const progress = __mf_6(() => {
  const task = current.value;
  if (!task) return 0
  if (task.lines_total) return Math.round(((task.lines_done || 0) / task.lines_total) * 100)
  if (task.total) return Math.round(((task.done || 0) / task.total) * 100)
  return 0
});

function fmt(seconds) {
  const value = Number(seconds) || 0;
  if (value < 60) return `${value} 秒`
  const m = Math.floor(value / 60);
  const s = value % 60;
  if (m < 60) return `${m} 分 ${s} 秒`
  return `${Math.floor(m / 60)} 小时 ${m % 60} 分`
}

function stateText(state) {
  return { done: '完成', failed: '失败', stopped: '已停止', interrupted: '已中断', running: '进行中' }[state] || state || ''
}

function stateColor(state) {
  return { done: 'success', failed: 'error', stopped: 'warning', interrupted: 'grey', running: 'primary' }[state] || 'grey'
}

function resultText(task) {
  if (!task) return ''
  const parts = [`成功 ${task.ok || 0}`];
  if (task.skip) parts.push(`跳过 ${task.skip}`);
  if (task.fail) parts.push(`失败 ${task.fail}`);
  let text = `${task.title || ''} · ${parts.join('，')}`;
  if (task.started && task.finished) {
    Math.max(0, Math.round((task.finished_ts || 0) - (task.finished_ts || 0)));
  }
  if (task.message && task.state !== 'done') text += ` · ${task.message}`;
  if (task.fail && task.results) {
    const failure = task.results.find(r => r.status === 'fail');
    if (failure) text += ` · ${failure.name}: ${failure.message}`;
  }
  return text
}

function unwrap(res) {
  if (!res) return {}
  if (res.data && typeof res.data === 'object' && res.success === undefined) return res.data
  return res
}

function openSettings() {
  emit('switch');
}

async function search() {
  searching.value = true;
  error.value = '';
  try {
    const params = { q: q.value || '', type: type.value === 'all' ? '' : type.value };
    const body = unwrap(await props.api.get('plugin/SubtitleTranslator/search', { params }));
    if (body.success === false) {
      error.value = body.message || '搜索失败';
      items.value = [];
    } else {
      items.value = body.items || [];
    }
  } catch (err) {
    error.value = err?.message || '搜索失败';
    items.value = [];
  } finally {
    searching.value = false;
    searched.value = true;
  }
}

function onClear() {
  q.value = '';
  search();
}

async function openProbe(item) {
  probeItem.value = item;
  probeStreams.value = [];
  probeVideo.value = item.path || '';
  probeMessage.value = '';
  probeError.value = '';
  selectedTrack.value = -1;
  probeExisting.value = 0;
  probeFiles.value = 1;
  forceRetranslate.value = true;
  probeDialog.value = true;
  probeLoading.value = true;
  try {
    const body = unwrap(await props.api.get('plugin/SubtitleTranslator/probe', {
      params: { id: item.id, path: item.path },
    }));
    if (body.success === false) {
      probeError.value = body.message || '探测失败';
    } else {
      probeStreams.value = body.streams || [];
      probeVideo.value = body.video || item.path || '';
      probeMessage.value = body.message || '';
      probeExisting.value = body.existing || 0;
      probeFiles.value = body.files || 1;
      forceRetranslate.value = true;
    }
  } catch (err) {
    probeError.value = err?.message || '探测失败';
  } finally {
    probeLoading.value = false;
  }
}

async function confirmTranslate() {
  const item = probeItem.value;
  if (!item) return
  starting.value = true;
  probeError.value = '';
  try {
    const payload = {
      id: item.id, path: item.path, title: item.title,
      force: forceRetranslate.value || probeExisting.value === 0,
    };
    if (selectedTrack.value >= 0) payload.stream_index = selectedTrack.value;
    const body = unwrap(await props.api.post('plugin/SubtitleTranslator/translate', payload));
    if (body.success === false) {
      probeError.value = body.message || '启动失败';
      return
    }
    probeDialog.value = false;
    lastResult.value = null;
    startedInfo.value = {
      title: item.title,
      task_id: body.task_id,
      position: body.position || 1,
      files: body.files || 1,
      eta_low: body.eta_low || 3,
      eta_high: body.eta_high || 6,
    };
    startedDialog.value = true;
    await fetchStatus();
  } catch (err) {
    probeError.value = err?.message || '启动失败';
  } finally {
    starting.value = false;
  }
}

async function stop() {
  try {
    await props.api.post('plugin/SubtitleTranslator/stop', {});
    await fetchStatus();
  } catch (err) {
    error.value = err?.message || '停止失败';
  }
}

async function fetchStatus() {
  try {
    const body = unwrap(await props.api.get('plugin/SubtitleTranslator/status'));
    const cur = body.current || null;
    current.value = cur;
    queue.value = body.queue || [];
    history.value = body.history || [];

    const running = !!cur && (cur.state === 'running' || cur.state === 'queued');
    if (running) {
      hadTask = true;
      ensurePolling();
    } else if (hadTask) {
      // 任务刚结束：刷新列表让徽章变成「已有中文」，并把结果留在页面上
      hadTask = false;
      stopPolling();
      lastResult.value = (body.history || [])[0] || null;
      search();
    }
  } catch (err) {
    // 轮询失败不打扰用户
  }
}

function ensurePolling() {
  if (timer) return
  timer = setInterval(fetchStatus, 3000);
}

function stopPolling() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

__mf_14(async () => {
  search();
  await fetchStatus();
  // 页面刚打开时，如果十分钟内刚跑完一次任务，也把结果亮出来
  if (!current.value && !lastResult.value && history.value.length) {
    const latest = history.value[0];
    const ago = Date.now() / 1000 - (latest.finished_ts || 0);
    if (ago >= 0 && ago < 600) lastResult.value = latest;
  }
});

__mf_13(stopPolling);

return (_ctx, _cache) => {
  const _component_v_btn = __mf_17("v-btn");
  const _component_v_card_item = __mf_17("v-card-item");
  const _component_v_progress_circular = __mf_17("v-progress-circular");
  const _component_v_chip = __mf_17("v-chip");
  const _component_v_spacer = __mf_17("v-spacer");
  const _component_v_progress_linear = __mf_17("v-progress-linear");
  const _component_v_alert = __mf_17("v-alert");
  const _component_v_text_field = __mf_17("v-text-field");
  const _component_v_select = __mf_17("v-select");
  const _component_v_skeleton_loader = __mf_17("v-skeleton-loader");
  const _component_v_img = __mf_17("v-img");
  const _component_v_icon = __mf_17("v-icon");
  const _component_v_card_text = __mf_17("v-card-text");
  const _component_v_card = __mf_17("v-card");
  const _component_v_card_title = __mf_17("v-card-title");
  const _component_v_card_subtitle = __mf_17("v-card-subtitle");
  const _component_v_switch = __mf_17("v-switch");
  const _component_v_radio = __mf_17("v-radio");
  const _component_v_radio_group = __mf_17("v-radio-group");
  const _component_v_card_actions = __mf_17("v-card-actions");
  const _component_v_dialog = __mf_17("v-dialog");

  return (__mf_15(), __mf_9("div", _hoisted_1, [
    __mf_12(_component_v_card, {
      variant: "flat",
      class: "page-card"
    }, {
      default: __mf_19(() => [
        __mf_12(_component_v_card_item, { class: "pb-2" }, {
          default: __mf_19(() => [
            __mf_10("div", _hoisted_2, [
              _cache[13] || (_cache[13] = __mf_10("div", null, [
                __mf_10("div", { class: "head-title" }, "字幕机翻"),
                __mf_10("div", { class: "head-sub" }, "搜索媒体库影视，把内嵌字幕翻成中文并写回同目录")
              ], -1)),
              (__props.show_switch)
                ? (__mf_15(), __mf_7(_component_v_btn, {
                    key: 0,
                    variant: "tonal",
                    size: "small",
                    "prepend-icon": "mdi-cog-outline",
                    onClick: openSettings
                  }, {
                    default: __mf_19(() => [...(_cache[12] || (_cache[12] = [
                      __mf_11(" 设置 ", -1)
                    ]))]),
                    _: 1
                  }))
                : __mf_8("", true)
            ])
          ]),
          _: 1
        }),
        __mf_12(_component_v_card_text, { class: "pt-2" }, {
          default: __mf_19(() => [
            (current.value)
              ? (__mf_15(), __mf_9("div", _hoisted_3, [
                  __mf_10("div", _hoisted_4, [
                    __mf_12(_component_v_progress_circular, {
                      indeterminate: "",
                      size: "16",
                      width: "2",
                      color: "primary"
                    }),
                    __mf_10("span", _hoisted_5, __mf_4(current.value.title), 1),
                    (queue.value.length)
                      ? (__mf_15(), __mf_7(_component_v_chip, {
                          key: 0,
                          size: "x-small",
                          variant: "tonal"
                        }, {
                          default: __mf_19(() => [
                            __mf_11("队列 " + __mf_4(queue.value.length), 1)
                          ]),
                          _: 1
                        }))
                      : __mf_8("", true),
                    __mf_12(_component_v_spacer),
                    __mf_12(_component_v_btn, {
                      size: "x-small",
                      variant: "text",
                      color: "error",
                      onClick: stop
                    }, {
                      default: __mf_19(() => [...(_cache[14] || (_cache[14] = [
                        __mf_11("停止", -1)
                      ]))]),
                      _: 1
                    })
                  ]),
                  __mf_12(_component_v_progress_linear, {
                    "model-value": progress.value,
                    height: "5",
                    rounded: "",
                    class: "my-2"
                  }, null, 8, ["model-value"]),
                  __mf_10("div", _hoisted_6, [
                    (__mf_15(), __mf_9(__mf_5, null, __mf_16(stageList, (stageItem, index) => {
                      return __mf_10("span", {
                        key: stageItem.key,
                        class: __mf_3(["stage-chip", {
                'stage-done': stageIndex.value > index,
                'stage-active': stageIndex.value === index,
              }])
                      }, __mf_4(stageItem.label), 3)
                    }), 64))
                  ]),
                  __mf_10("div", _hoisted_7, [
                    __mf_10("span", _hoisted_8, __mf_4(current.value.current || stageText.value), 1),
                    (current.value.lines_total)
                      ? (__mf_15(), __mf_9("span", _hoisted_9, "第 " + __mf_4(current.value.lines_done) + "/" + __mf_4(current.value.lines_total) + " 行", 1))
                      : __mf_8("", true),
                    (current.value.total > 1)
                      ? (__mf_15(), __mf_9("span", _hoisted_10, "第 " + __mf_4(current.value.done) + "/" + __mf_4(current.value.total) + " 集", 1))
                      : __mf_8("", true),
                    (current.value.elapsed !== undefined)
                      ? (__mf_15(), __mf_9("span", _hoisted_11, "已用 " + __mf_4(fmt(current.value.elapsed)), 1))
                      : __mf_8("", true),
                    (current.value.eta)
                      ? (__mf_15(), __mf_9("span", _hoisted_12, "预计剩余 " + __mf_4(fmt(current.value.eta)), 1))
                      : __mf_8("", true)
                  ]),
                  (queue.value.length)
                    ? (__mf_15(), __mf_9("div", _hoisted_13, " 排队：" + __mf_4(queue.value.map(q => q.title).slice(0, 4).join('、')) + __mf_4(queue.value.length > 4 ? ' 等' : ''), 1))
                    : __mf_8("", true)
                ]))
              : __mf_8("", true),
            (!current.value && lastResult.value)
              ? (__mf_15(), __mf_7(_component_v_alert, {
                  key: 1,
                  type: lastResult.value.state === 'done' ? 'success' : (lastResult.value.state === 'stopped' ? 'warning' : 'error'),
                  variant: "tonal",
                  density: "compact",
                  class: "mb-3",
                  closable: "",
                  "onClick:close": _cache[0] || (_cache[0] = $event => (lastResult.value = null))
                }, {
                  default: __mf_19(() => [
                    __mf_11(__mf_4(resultText(lastResult.value)), 1)
                  ]),
                  _: 1
                }, 8, ["type"]))
              : __mf_8("", true),
            (error.value)
              ? (__mf_15(), __mf_7(_component_v_alert, {
                  key: 2,
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
            __mf_10("div", _hoisted_14, [
              __mf_12(_component_v_text_field, {
                modelValue: q.value,
                "onUpdate:modelValue": _cache[1] || (_cache[1] = $event => ((q).value = $event)),
                placeholder: "搜索片名，留空看最新入库",
                "prepend-inner-icon": "mdi-magnify",
                density: "comfortable",
                variant: "solo-filled",
                flat: "",
                "hide-details": "",
                clearable: "",
                class: "search-field",
                onKeyup: __mf_0(search, ["enter"]),
                "onClick:clear": onClear
              }, null, 8, ["modelValue"]),
              __mf_12(_component_v_select, {
                modelValue: type.value,
                "onUpdate:modelValue": [
                  _cache[2] || (_cache[2] = $event => ((type).value = $event)),
                  search
                ],
                items: typeOptions,
                density: "comfortable",
                variant: "solo-filled",
                flat: "",
                "hide-details": "",
                class: "type-field"
              }, null, 8, ["modelValue"]),
              __mf_12(_component_v_btn, {
                color: "primary",
                height: "44",
                loading: searching.value,
                onClick: search
              }, {
                default: __mf_19(() => [...(_cache[15] || (_cache[15] = [
                  __mf_11("搜索", -1)
                ]))]),
                _: 1
              }, 8, ["loading"])
            ]),
            __mf_10("div", _hoisted_15, [
              __mf_10("span", _hoisted_16, __mf_4(q.value ? '搜索结果' : '最新入库'), 1),
              __mf_10("span", _hoisted_17, "共 " + __mf_4(items.value.length) + " 部", 1),
              __mf_12(_component_v_spacer),
              (history.value.length)
                ? (__mf_15(), __mf_7(_component_v_btn, {
                    key: 0,
                    size: "x-small",
                    variant: "text",
                    "append-icon": "mdi-history",
                    onClick: _cache[3] || (_cache[3] = $event => (showHistory.value = true))
                  }, {
                    default: __mf_19(() => [...(_cache[16] || (_cache[16] = [
                      __mf_11(" 最近任务 ", -1)
                    ]))]),
                    _: 1
                  }))
                : __mf_8("", true)
            ]),
            (searching.value && !items.value.length)
              ? (__mf_15(), __mf_9("div", _hoisted_18, [
                  (__mf_15(), __mf_9(__mf_5, null, __mf_16(6, (n) => {
                    return __mf_12(_component_v_skeleton_loader, {
                      key: n,
                      type: "image, article"
                    })
                  }), 64))
                ]))
              : (__mf_15(), __mf_9("div", _hoisted_19, [
                  (__mf_15(true), __mf_9(__mf_5, null, __mf_16(items.value, (item) => {
                    return (__mf_15(), __mf_9("div", {
                      key: item.id,
                      class: "card"
                    }, [
                      __mf_10("div", _hoisted_20, [
                        (item.poster)
                          ? (__mf_15(), __mf_7(_component_v_img, {
                              key: 0,
                              src: item.poster,
                              cover: "",
                              class: "poster",
                              onError: $event => (item.poster = '')
                            }, {
                              placeholder: __mf_19(() => [...(_cache[17] || (_cache[17] = [
                                __mf_10("div", { class: "poster-loading" }, null, -1)
                              ]))]),
                              _: 1
                            }, 8, ["src", "onError"]))
                          : (__mf_15(), __mf_9("div", _hoisted_21, [
                              __mf_12(_component_v_icon, {
                                size: "30",
                                color: "grey"
                              }, {
                                default: __mf_19(() => [...(_cache[18] || (_cache[18] = [
                                  __mf_11("mdi-filmstrip-box-multiple", -1)
                                ]))]),
                                _: 1
                              })
                            ])),
                        __mf_12(_component_v_chip, {
                          class: "poster-badge",
                          size: "x-small",
                          color: item.has_cn ? 'success' : 'warning',
                          variant: "flat"
                        }, {
                          default: __mf_19(() => [
                            __mf_11(__mf_4(item.has_cn ? '已有中文' : '需翻译'), 1)
                          ]),
                          _: 2
                        }, 1032, ["color"]),
                        (item.type === 'Series')
                          ? (__mf_15(), __mf_9("span", _hoisted_22, "剧集"))
                          : __mf_8("", true)
                      ]),
                      __mf_10("div", _hoisted_23, [
                        __mf_10("div", {
                          class: "title-line",
                          title: item.title
                        }, __mf_4(item.title), 9, _hoisted_24),
                        __mf_10("div", _hoisted_25, [
                          (item.created)
                            ? (__mf_15(), __mf_9("span", _hoisted_26, __mf_4(item.created) + " 入库", 1))
                            : (__mf_15(), __mf_9("span", _hoisted_27, __mf_4(item.year || '—'), 1))
                        ]),
                        __mf_10("div", _hoisted_28, [
                          __mf_12(_component_v_chip, {
                            size: "x-small",
                            variant: "tonal"
                          }, {
                            default: __mf_19(() => [
                              __mf_11(__mf_4(item.sub_count ? item.sub_count + ' 条字幕轨' : '未知字幕'), 1)
                            ]),
                            _: 2
                          }, 1024),
                          (item.sub_langs && item.sub_langs.length)
                            ? (__mf_15(), __mf_7(_component_v_chip, {
                                key: 0,
                                size: "x-small",
                                variant: "text"
                              }, {
                                default: __mf_19(() => [
                                  __mf_11(__mf_4(item.sub_langs.slice(0, 3).join('/')), 1)
                                ]),
                                _: 2
                              }, 1024))
                            : __mf_8("", true)
                        ])
                      ]),
                      __mf_10("div", _hoisted_29, [
                        __mf_12(_component_v_btn, {
                          size: "small",
                          color: "primary",
                          variant: "tonal",
                          block: "",
                          onClick: $event => (openProbe(item))
                        }, {
                          default: __mf_19(() => [...(_cache[19] || (_cache[19] = [
                            __mf_11("机翻", -1)
                          ]))]),
                          _: 1
                        }, 8, ["onClick"])
                      ])
                    ]))
                  }), 128))
                ])),
            (!searching.value && searched.value && !items.value.length)
              ? (__mf_15(), __mf_9("div", _hoisted_30, " 没有匹配的影视条目 "))
              : __mf_8("", true)
          ]),
          _: 1
        })
      ]),
      _: 1
    }),
    __mf_12(_component_v_dialog, {
      modelValue: probeDialog.value,
      "onUpdate:modelValue": _cache[7] || (_cache[7] = $event => ((probeDialog).value = $event)),
      "max-width": "620",
      scrollable: ""
    }, {
      default: __mf_19(() => [
        __mf_12(_component_v_card, null, {
          default: __mf_19(() => [
            __mf_12(_component_v_card_item, null, {
              default: __mf_19(() => [
                __mf_12(_component_v_card_title, { class: "text-body-1 font-weight-bold" }, {
                  default: __mf_19(() => [
                    __mf_11(__mf_4(probeItem.value?.title || ''), 1)
                  ]),
                  _: 1
                }),
                __mf_12(_component_v_card_subtitle, { class: "text-caption" }, {
                  default: __mf_19(() => [
                    __mf_11(__mf_4(probeVideo.value || ''), 1)
                  ]),
                  _: 1
                })
              ]),
              _: 1
            }),
            __mf_12(_component_v_card_text, null, {
              default: __mf_19(() => [
                (probeMessage.value)
                  ? (__mf_15(), __mf_7(_component_v_alert, {
                      key: 0,
                      type: "info",
                      variant: "tonal",
                      density: "compact",
                      class: "mb-3"
                    }, {
                      default: __mf_19(() => [
                        __mf_11(__mf_4(probeMessage.value), 1)
                      ]),
                      _: 1
                    }))
                  : __mf_8("", true),
                (probeError.value)
                  ? (__mf_15(), __mf_7(_component_v_alert, {
                      key: 1,
                      type: "error",
                      variant: "tonal",
                      density: "compact",
                      class: "mb-3"
                    }, {
                      default: __mf_19(() => [
                        __mf_11(__mf_4(probeError.value), 1)
                      ]),
                      _: 1
                    }))
                  : __mf_8("", true),
                (probeLoading.value)
                  ? (__mf_15(), __mf_9("div", _hoisted_31, [
                      __mf_12(_component_v_progress_circular, {
                        indeterminate: "",
                        color: "primary"
                      })
                    ]))
                  : __mf_8("", true),
                (!probeLoading.value && probeExisting.value > 0)
                  ? (__mf_15(), __mf_7(_component_v_alert, {
                      key: 3,
                      type: "warning",
                      variant: "tonal",
                      density: "compact",
                      class: "mb-3"
                    }, {
                      default: __mf_19(() => [
                        __mf_11(" 检测到 " + __mf_4(probeExisting.value) + " 个文件已有中文字幕，默认会重新翻译覆盖 ", 1)
                      ]),
                      _: 1
                    }))
                  : __mf_8("", true),
                (!probeLoading.value && probeExisting.value > 0)
                  ? (__mf_15(), __mf_9("div", _hoisted_32, [
                      __mf_12(_component_v_switch, {
                        modelValue: forceRetranslate.value,
                        "onUpdate:modelValue": _cache[4] || (_cache[4] = $event => ((forceRetranslate).value = $event)),
                        color: "primary",
                        density: "compact",
                        "hide-details": "",
                        inset: "",
                        label: probeExisting.value > 1 ? `重新翻译这 ${probeExisting.value} 个文件` : '重新翻译'
                      }, null, 8, ["modelValue", "label"])
                    ]))
                  : __mf_8("", true),
                (!probeLoading.value)
                  ? (__mf_15(), __mf_7(_component_v_radio_group, {
                      key: 5,
                      modelValue: selectedTrack.value,
                      "onUpdate:modelValue": _cache[5] || (_cache[5] = $event => ((selectedTrack).value = $event)),
                      "hide-details": ""
                    }, {
                      default: __mf_19(() => [
                        __mf_12(_component_v_radio, {
                          value: -1,
                          label: "自动选择（优先英文，跳过图形字幕）"
                        }),
                        (__mf_15(true), __mf_9(__mf_5, null, __mf_16(probeStreams.value, (track) => {
                          return (__mf_15(), __mf_7(_component_v_radio, {
                            key: track.index,
                            value: track.index,
                            disabled: track.bitmap
                          }, {
                            label: __mf_19(() => [
                              __mf_10("span", _hoisted_33, [
                                __mf_11(" #" + __mf_4(track.index) + " · " + __mf_4(track.lang || '未知语言') + " ", 1),
                                (track.title)
                                  ? (__mf_15(), __mf_9("span", _hoisted_34, __mf_4(track.title), 1))
                                  : __mf_8("", true),
                                (track.bitmap)
                                  ? (__mf_15(), __mf_7(_component_v_chip, {
                                      key: 1,
                                      size: "x-small",
                                      color: "warning",
                                      variant: "tonal",
                                      class: "ml-2"
                                    }, {
                                      default: __mf_19(() => [...(_cache[20] || (_cache[20] = [
                                        __mf_11("图形字幕", -1)
                                      ]))]),
                                      _: 1
                                    }))
                                  : __mf_8("", true)
                              ])
                            ]),
                            _: 2
                          }, 1032, ["value", "disabled"]))
                        }), 128))
                      ]),
                      _: 1
                    }, 8, ["modelValue"]))
                  : __mf_8("", true)
              ]),
              _: 1
            }),
            __mf_12(_component_v_card_actions, { class: "px-4 pb-3" }, {
              default: __mf_19(() => [
                (!probeLoading.value)
                  ? (__mf_15(), __mf_9("span", _hoisted_35, "加入队列后在后台运行，可以关掉页面"))
                  : __mf_8("", true),
                __mf_12(_component_v_spacer),
                __mf_12(_component_v_btn, {
                  variant: "text",
                  onClick: _cache[6] || (_cache[6] = $event => (probeDialog.value = false))
                }, {
                  default: __mf_19(() => [...(_cache[21] || (_cache[21] = [
                    __mf_11("取消", -1)
                  ]))]),
                  _: 1
                }),
                __mf_12(_component_v_btn, {
                  color: "primary",
                  loading: starting.value,
                  onClick: confirmTranslate
                }, {
                  default: __mf_19(() => [...(_cache[22] || (_cache[22] = [
                    __mf_11("开始翻译", -1)
                  ]))]),
                  _: 1
                }, 8, ["loading"])
              ]),
              _: 1
            })
          ]),
          _: 1
        })
      ]),
      _: 1
    }, 8, ["modelValue"]),
    __mf_12(_component_v_dialog, {
      modelValue: startedDialog.value,
      "onUpdate:modelValue": _cache[10] || (_cache[10] = $event => ((startedDialog).value = $event)),
      "max-width": "500"
    }, {
      default: __mf_19(() => [
        __mf_12(_component_v_card, null, {
          default: __mf_19(() => [
            __mf_12(_component_v_card_item, null, {
              default: __mf_19(() => [
                __mf_10("div", _hoisted_36, [
                  __mf_12(_component_v_icon, {
                    color: "success",
                    size: "22"
                  }, {
                    default: __mf_19(() => [...(_cache[23] || (_cache[23] = [
                      __mf_11("mdi-check-circle", -1)
                    ]))]),
                    _: 1
                  }),
                  _cache[24] || (_cache[24] = __mf_10("span", { class: "started-title" }, "已转入后台翻译", -1))
                ]),
                __mf_12(_component_v_card_subtitle, { class: "text-caption" }, {
                  default: __mf_19(() => [
                    __mf_11(__mf_4(startedInfo.value?.title || ''), 1)
                  ]),
                  _: 1
                })
              ]),
              _: 1
            }),
            __mf_12(_component_v_card_text, null, {
              default: __mf_19(() => [
                __mf_10("div", _hoisted_37, [
                  _cache[25] || (_cache[25] = __mf_11(" 预计 ", -1)),
                  __mf_10("b", null, __mf_4(startedInfo.value?.eta_low) + "～" + __mf_4(startedInfo.value?.eta_high) + " 分钟", 1),
                  _cache[26] || (_cache[26] = __mf_11("完成， 大概 ", -1)),
                  __mf_10("b", null, __mf_4(finishClock.value), 1),
                  _cache[27] || (_cache[27] = __mf_11(" 前后就能在媒体库里看到中文字幕 ", -1))
                ]),
                __mf_12(_component_v_alert, {
                  type: "info",
                  variant: "tonal",
                  density: "compact",
                  class: "mt-3"
                }, {
                  default: __mf_19(() => [...(_cache[28] || (_cache[28] = [
                    __mf_11(" 可以关掉这个页面去做别的。翻译完成后会通过 MoviePilot 通知你， 字幕会自动写好并刷新媒体库，直接去观影就行。 ", -1)
                  ]))]),
                  _: 1
                }),
                (startedInfo.value && startedInfo.value.position > 1)
                  ? (__mf_15(), __mf_9("div", _hoisted_38, " 前面还有 " + __mf_4(startedInfo.value.position - 1) + " 个任务在排队，实际等待会更久 ", 1))
                  : __mf_8("", true),
                (runningThis.value)
                  ? (__mf_15(), __mf_9("div", _hoisted_39, [
                      __mf_10("div", _hoisted_40, [
                        __mf_10("span", _hoisted_41, __mf_4(stageText.value), 1)
                      ]),
                      __mf_10("div", _hoisted_42, [
                        __mf_10("span", _hoisted_43, __mf_4(current.value.current || ''), 1),
                        (current.value.eta)
                          ? (__mf_15(), __mf_9("span", _hoisted_44, "还剩约 " + __mf_4(fmt(current.value.eta)), 1))
                          : __mf_8("", true)
                      ]),
                      __mf_12(_component_v_progress_linear, {
                        "model-value": progress.value,
                        height: "5",
                        rounded: "",
                        class: "my-2"
                      }, null, 8, ["model-value"]),
                      __mf_10("div", _hoisted_45, [
                        (current.value.lines_total)
                          ? (__mf_15(), __mf_9("span", _hoisted_46, "第 " + __mf_4(current.value.lines_done) + "/" + __mf_4(current.value.lines_total) + " 行", 1))
                          : __mf_8("", true),
                        (current.value.total > 1)
                          ? (__mf_15(), __mf_9("span", _hoisted_47, "第 " + __mf_4(current.value.done) + "/" + __mf_4(current.value.total) + " 集", 1))
                          : __mf_8("", true),
                        (current.value.elapsed !== undefined)
                          ? (__mf_15(), __mf_9("span", _hoisted_48, "已用 " + __mf_4(fmt(current.value.elapsed)), 1))
                          : __mf_8("", true)
                      ])
                    ]))
                  : __mf_8("", true)
              ]),
              _: 1
            }),
            __mf_12(_component_v_card_actions, { class: "px-4 pb-3" }, {
              default: __mf_19(() => [
                __mf_12(_component_v_btn, {
                  variant: "text",
                  onClick: _cache[8] || (_cache[8] = $event => (startedDialog.value = false))
                }, {
                  default: __mf_19(() => [...(_cache[29] || (_cache[29] = [
                    __mf_11("留在这里看进度", -1)
                  ]))]),
                  _: 1
                }),
                __mf_12(_component_v_spacer),
                __mf_12(_component_v_btn, {
                  color: "primary",
                  onClick: _cache[9] || (_cache[9] = $event => (startedDialog.value = false))
                }, {
                  default: __mf_19(() => [...(_cache[30] || (_cache[30] = [
                    __mf_11("后台运行", -1)
                  ]))]),
                  _: 1
                })
              ]),
              _: 1
            })
          ]),
          _: 1
        })
      ]),
      _: 1
    }, 8, ["modelValue"]),
    __mf_12(_component_v_dialog, {
      modelValue: showHistory.value,
      "onUpdate:modelValue": _cache[11] || (_cache[11] = $event => ((showHistory).value = $event)),
      "max-width": "720",
      scrollable: ""
    }, {
      default: __mf_19(() => [
        __mf_12(_component_v_card, null, {
          default: __mf_19(() => [
            __mf_12(_component_v_card_item, null, {
              default: __mf_19(() => [
                __mf_12(_component_v_card_title, { class: "text-body-1 font-weight-bold" }, {
                  default: __mf_19(() => [...(_cache[31] || (_cache[31] = [
                    __mf_11("最近任务", -1)
                  ]))]),
                  _: 1
                })
              ]),
              _: 1
            }),
            __mf_12(_component_v_card_text, null, {
              default: __mf_19(() => [
                (__mf_15(true), __mf_9(__mf_5, null, __mf_16(history.value, (task) => {
                  return (__mf_15(), __mf_9("div", {
                    key: task.id,
                    class: "history-item"
                  }, [
                    __mf_12(_component_v_chip, {
                      size: "x-small",
                      color: stateColor(task.state),
                      variant: "flat"
                    }, {
                      default: __mf_19(() => [
                        __mf_11(__mf_4(stateText(task.state)), 1)
                      ]),
                      _: 2
                    }, 1032, ["color"]),
                    __mf_10("span", _hoisted_49, __mf_4(task.title), 1),
                    __mf_10("span", _hoisted_50, __mf_4(resultText(task)), 1),
                    __mf_10("span", _hoisted_51, __mf_4(task.finished), 1)
                  ]))
                }), 128)),
                (!history.value.length)
                  ? (__mf_15(), __mf_9("div", _hoisted_52, "还没有任务记录"))
                  : __mf_8("", true)
              ]),
              _: 1
            })
          ]),
          _: 1
        })
      ]),
      _: 1
    }, 8, ["modelValue"])
  ]))
}
}

};
const Page = /*#__PURE__*/_export_sfc(_sfc_main, [['__scopeId',"data-v-0c516962"]]);

export { Page as default };
