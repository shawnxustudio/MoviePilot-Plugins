<template>
  <div class="subtr-page">
    <v-card variant="flat" class="page-card">
      <v-card-item class="pb-2">
        <div class="head-row">
          <div>
            <div class="head-title">字幕机翻</div>
            <div class="head-sub">搜索媒体库影视，把内嵌字幕翻成中文并写回同目录</div>
          </div>
          <v-btn
            v-if="show_switch"
            variant="tonal"
            size="small"
            prepend-icon="mdi-cog-outline"
            @click="openSettings"
          >
            设置
          </v-btn>
        </div>
      </v-card-item>

      <v-card-text class="pt-2">
        <!-- 进行中：顶部任务条 -->
        <div v-if="current" class="task-strip mb-3">
          <div class="task-head">
            <v-progress-circular indeterminate size="16" width="2" color="primary" />
            <span class="task-title">{{ current.title }}</span>
            <v-chip v-if="queue.length" size="x-small" variant="tonal">队列 {{ queue.length }}</v-chip>
            <v-spacer />
            <v-btn size="x-small" variant="text" color="error" @click="stop">停止</v-btn>
          </div>
          <v-progress-linear :model-value="progress" height="5" rounded class="my-2" />
          <div class="stage-row">
            <span
              v-for="(stageItem, index) in stageList"
              :key="stageItem.key"
              class="stage-chip"
              :class="{
                'stage-done': stageIndex > index,
                'stage-active': stageIndex === index,
              }"
            >
              {{ stageItem.label }}
            </span>
          </div>
          <div class="task-meta">
            <span class="task-file">{{ current.current || stageText }}</span>
            <span v-if="current.lines_total">第 {{ current.lines_done }}/{{ current.lines_total }} 行</span>
            <span v-if="current.total > 1">第 {{ current.done }}/{{ current.total }} 集</span>
            <span v-if="current.elapsed !== undefined">已用 {{ fmt(current.elapsed) }}</span>
            <span v-if="current.eta">预计剩余 {{ fmt(current.eta) }}</span>
          </div>
          <div v-if="queue.length" class="queue-line">
            排队：{{ queue.map(q => q.title).slice(0, 4).join('、') }}{{ queue.length > 4 ? ' 等' : '' }}
          </div>
        </div>

        <!-- 最近一次结果 -->
        <v-alert
          v-if="!current && lastResult"
          :type="lastResult.state === 'done' ? 'success' : (lastResult.state === 'stopped' ? 'warning' : 'error')"
          variant="tonal"
          density="compact"
          class="mb-3"
          closable
          @click:close="lastResult = null"
        >
          {{ resultText(lastResult) }}
        </v-alert>

        <v-alert v-if="error" type="error" variant="tonal" density="compact" class="mb-3">{{ error }}</v-alert>

        <div class="toolbar">
          <v-text-field
            v-model="q"
            placeholder="搜索片名，留空看最新入库"
            prepend-inner-icon="mdi-magnify"
            density="comfortable"
            variant="solo-filled"
            flat
            hide-details
            clearable
            class="search-field"
            @keyup.enter="search"
            @click:clear="onClear"
          />
          <v-select
            v-model="type"
            :items="typeOptions"
            density="comfortable"
            variant="solo-filled"
            flat
            hide-details
            class="type-field"
            @update:model-value="search"
          />
          <v-btn color="primary" height="44" :loading="searching" @click="search">搜索</v-btn>
        </div>

        <div class="section-line">
          <span class="section-title">{{ q ? '搜索结果' : '最新入库' }}</span>
          <span class="section-count">共 {{ items.length }} 部</span>
          <v-spacer />
          <v-btn
            v-if="history.length"
            size="x-small"
            variant="text"
            append-icon="mdi-history"
            @click="showHistory = true"
          >
            最近任务
          </v-btn>
        </div>

        <div v-if="searching && !items.length" class="skeleton-grid">
          <v-skeleton-loader v-for="n in 6" :key="n" type="image, article" />
        </div>

        <div v-else class="result-grid">
          <div v-for="item in items" :key="item.id" class="card">
            <div class="poster-wrap">
              <v-img
                v-if="item.poster"
                :src="item.poster"
                cover
                class="poster"
                @error="item.poster = ''"
              >
                <template #placeholder>
                  <div class="poster-loading" />
                </template>
              </v-img>
              <div v-else class="poster-fallback">
                <v-icon size="30" color="grey">mdi-filmstrip-box-multiple</v-icon>
              </div>
              <v-chip
                class="poster-badge"
                size="x-small"
                :color="item.has_cn ? 'success' : 'warning'"
                variant="flat"
              >
                {{ item.has_cn ? '已有中文' : '需翻译' }}
              </v-chip>
              <span v-if="item.type === 'Series'" class="type-badge">剧集</span>
            </div>

            <div class="card-body">
              <div class="title-line" :title="item.title">{{ item.title }}</div>
              <div class="meta-line">
                <span v-if="item.created">{{ item.created }} 入库</span>
                <span v-else>{{ item.year || '—' }}</span>
              </div>
              <div class="chip-line">
                <v-chip size="x-small" variant="tonal">
                  {{ item.sub_count ? item.sub_count + ' 条字幕轨' : '未知字幕' }}
                </v-chip>
                <v-chip v-if="item.sub_langs && item.sub_langs.length" size="x-small" variant="text">
                  {{ item.sub_langs.slice(0, 3).join('/') }}
                </v-chip>
              </div>
            </div>

            <div class="card-actions">
              <v-btn size="small" color="primary" variant="tonal" block @click="openProbe(item)">机翻</v-btn>
            </div>
          </div>
        </div>

        <div v-if="!searching && searched && !items.length" class="empty-tip">
          没有匹配的影视条目
        </div>
      </v-card-text>
    </v-card>

    <!-- 选轨弹窗 -->
    <v-dialog v-model="probeDialog" max-width="620" scrollable>
      <v-card>
        <v-card-item>
          <v-card-title class="text-body-1 font-weight-bold">{{ probeItem?.title || '' }}</v-card-title>
          <v-card-subtitle class="text-caption">{{ probeVideo || '' }}</v-card-subtitle>
        </v-card-item>
        <v-card-text>
          <v-alert v-if="probeMessage" type="info" variant="tonal" density="compact" class="mb-3">
            {{ probeMessage }}
          </v-alert>
          <v-alert v-if="probeError" type="error" variant="tonal" density="compact" class="mb-3">
            {{ probeError }}
          </v-alert>
          <div v-if="probeLoading" class="d-flex justify-center pa-6">
            <v-progress-circular indeterminate color="primary" />
          </div>
          <v-alert
            v-if="!probeLoading && probeExisting > 0"
            type="warning"
            variant="tonal"
            density="compact"
            class="mb-3"
          >
            检测到 {{ probeExisting }} 个文件已有中文字幕，默认会重新翻译覆盖
          </v-alert>
          <div v-if="!probeLoading && probeExisting > 0" class="force-row">
            <v-switch
              v-model="forceRetranslate"
              color="primary"
              density="compact"
              hide-details
              inset
              :label="probeExisting > 1 ? `重新翻译这 ${probeExisting} 个文件` : '重新翻译'"
            />
          </div>
          <v-radio-group v-if="!probeLoading" v-model="selectedTrack" hide-details>
            <v-radio :value="-1" label="自动选择（优先英文，跳过图形字幕）" />
            <v-radio
              v-for="track in probeStreams"
              :key="track.index"
              :value="track.index"
              :disabled="track.bitmap"
            >
              <template #label>
                <span class="track-label">
                  #{{ track.index }} · {{ track.lang || '未知语言' }}
                  <span v-if="track.title" class="track-title">{{ track.title }}</span>
                  <v-chip v-if="track.bitmap" size="x-small" color="warning" variant="tonal" class="ml-2">图形字幕</v-chip>
                </span>
              </template>
            </v-radio>
          </v-radio-group>
        </v-card-text>
        <v-card-actions class="px-4 pb-3">
          <span v-if="!probeLoading" class="text-caption opacity-70">加入队列后在后台运行，可以关掉页面</span>
          <v-spacer />
          <v-btn variant="text" @click="probeDialog = false">取消</v-btn>
          <v-btn color="primary" :loading="starting" @click="confirmTranslate">开始翻译</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- 开始后的等待提示 -->
    <v-dialog v-model="startedDialog" max-width="500">
      <v-card>
        <v-card-item>
          <div class="started-head">
            <v-icon color="success" size="22">mdi-check-circle</v-icon>
            <span class="started-title">已转入后台翻译</span>
          </div>
          <v-card-subtitle class="text-caption">{{ startedInfo?.title || '' }}</v-card-subtitle>
        </v-card-item>
        <v-card-text>
          <div class="eta-line">
            预计 <b>{{ startedInfo?.eta_low }}～{{ startedInfo?.eta_high }} 分钟</b>完成，
            大概 <b>{{ finishClock }}</b> 前后就能在媒体库里看到中文字幕
          </div>
          <v-alert type="info" variant="tonal" density="compact" class="mt-3">
            可以关掉这个页面去做别的。翻译完成后会通过 MoviePilot 通知你，
            字幕会自动写好并刷新媒体库，直接去观影就行。
          </v-alert>

          <div v-if="startedInfo && startedInfo.position > 1" class="queue-hint">
            前面还有 {{ startedInfo.position - 1 }} 个任务在排队，实际等待会更久
          </div>

          <div v-if="runningThis" class="live-box">
            <div class="live-row live-stage">
              <span class="stage-text">{{ stageText }}</span>
            </div>
            <div class="live-row">
              <span class="live-file">{{ current.current || '' }}</span>
              <span v-if="current.eta">还剩约 {{ fmt(current.eta) }}</span>
            </div>
            <v-progress-linear :model-value="progress" height="5" rounded class="my-2" />
            <div class="live-row">
              <span v-if="current.lines_total">第 {{ current.lines_done }}/{{ current.lines_total }} 行</span>
              <span v-if="current.total > 1">第 {{ current.done }}/{{ current.total }} 集</span>
              <span v-if="current.elapsed !== undefined">已用 {{ fmt(current.elapsed) }}</span>
            </div>
          </div>
        </v-card-text>
        <v-card-actions class="px-4 pb-3">
          <v-btn variant="text" @click="startedDialog = false">留在这里看进度</v-btn>
          <v-spacer />
          <v-btn color="primary" @click="startedDialog = false">后台运行</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- 最近任务 -->
    <v-dialog v-model="showHistory" max-width="720" scrollable>
      <v-card>
        <v-card-item>
          <v-card-title class="text-body-1 font-weight-bold">最近任务</v-card-title>
        </v-card-item>
        <v-card-text>
          <div v-for="task in history" :key="task.id" class="history-item">
            <v-chip size="x-small" :color="stateColor(task.state)" variant="flat">{{ stateText(task.state) }}</v-chip>
            <span class="history-title">{{ task.title }}</span>
            <span class="history-meta">{{ resultText(task) }}</span>
            <span class="history-time">{{ task.finished }}</span>
          </div>
          <div v-if="!history.length" class="empty-tip">还没有任务记录</div>
        </v-card-text>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

const props = defineProps({
  model: { type: Object, default: () => ({}) },
  api: { type: Object, default: () => ({}) },
  pluginId: { type: String, default: '' },
  // 宿主允许页面切到配置页时传 true，保持与官方插件一致的行为
  show_switch: { type: Boolean, default: true },
})

const emit = defineEmits(['action', 'switch', 'close'])

const q = ref('')
const type = ref('all')
const typeOptions = [
  { title: '全部', value: 'all' },
  { title: '电影', value: 'Movie' },
  { title: '剧集', value: 'Series' },
]

const items = ref([])
const searching = ref(false)
const searched = ref(false)
const error = ref('')

const current = ref(null)
const queue = ref([])
const history = ref([])
const lastResult = ref(null)
const showHistory = ref(false)

const startedDialog = ref(false)
const startedInfo = ref(null)

const probeDialog = ref(false)
const probeItem = ref(null)
const probeStreams = ref([])
const probeVideo = ref('')
const probeMessage = ref('')
const probeError = ref('')
const probeLoading = ref(false)
const selectedTrack = ref(-1)
const probeExisting = ref(0)
const probeFiles = ref(1)
const forceRetranslate = ref(true)
const starting = ref(false)

let timer = null
let hadTask = false

const stageList = [
  { key: 'extract', label: '提取字幕' },
  { key: 'translate', label: '翻译字幕' },
  { key: 'write', label: '写入字幕' },
  { key: 'refresh', label: '刷新媒体库' },
]

const stageIndex = computed(() => {
  const stage = current.value?.stage || ''
  if (stage === 'refresh' || stage === 'done') return 3
  if (stage === 'write') return 2
  if (stage === 'translate') return 1
  if (stage === 'extract') return 0
  return -1
})

const stageText = computed(() => {
  const stage = current.value?.stage || ''
  const label = {
    queued: '排队中',
    prepare: '准备文件',
    probe: '探测字幕轨',
    extract: '正在提取字幕',
    translate: '正在翻译字幕',
    write: '正在写入字幕',
    refresh: '正在刷新媒体库',
    done: '已完成',
  }[stage]
  return label || '准备中…'
})

const runningThis = computed(() => {
  const info = startedInfo.value
  const task = current.value
  return !!(info && task && info.task_id && task.id === info.task_id)
})

const finishClock = computed(() => {
  const info = startedInfo.value
  if (!info || !info.eta_high) return ''
  const at = new Date(Date.now() + info.eta_high * 60 * 1000)
  return `${String(at.getHours()).padStart(2, '0')}:${String(at.getMinutes()).padStart(2, '0')}`
})

const progress = computed(() => {
  const task = current.value
  if (!task) return 0
  if (task.lines_total) return Math.round(((task.lines_done || 0) / task.lines_total) * 100)
  if (task.total) return Math.round(((task.done || 0) / task.total) * 100)
  return 0
})

function fmt(seconds) {
  const value = Number(seconds) || 0
  if (value < 60) return `${value} 秒`
  const m = Math.floor(value / 60)
  const s = value % 60
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
  const parts = [`成功 ${task.ok || 0}`]
  if (task.skip) parts.push(`跳过 ${task.skip}`)
  if (task.fail) parts.push(`失败 ${task.fail}`)
  let text = `${task.title || ''} · ${parts.join('，')}`
  if (task.started && task.finished) {
    const seconds = Math.max(0, Math.round((task.finished_ts || 0) - (task.finished_ts || 0)))
    void seconds
  }
  if (task.message && task.state !== 'done') text += ` · ${task.message}`
  if (task.fail && task.results) {
    const failure = task.results.find(r => r.status === 'fail')
    if (failure) text += ` · ${failure.name}: ${failure.message}`
  }
  return text
}

function unwrap(res) {
  if (!res) return {}
  if (res.data && typeof res.data === 'object' && res.success === undefined) return res.data
  return res
}

function openSettings() {
  emit('switch')
}

async function search() {
  searching.value = true
  error.value = ''
  try {
    const params = { q: q.value || '', type: type.value === 'all' ? '' : type.value }
    const body = unwrap(await props.api.get('plugin/SubtitleTranslator/search', { params }))
    if (body.success === false) {
      error.value = body.message || '搜索失败'
      items.value = []
    } else {
      items.value = body.items || []
    }
  } catch (err) {
    error.value = err?.message || '搜索失败'
    items.value = []
  } finally {
    searching.value = false
    searched.value = true
  }
}

function onClear() {
  q.value = ''
  search()
}

async function openProbe(item) {
  probeItem.value = item
  probeStreams.value = []
  probeVideo.value = item.path || ''
  probeMessage.value = ''
  probeError.value = ''
  selectedTrack.value = -1
  probeExisting.value = 0
  probeFiles.value = 1
  forceRetranslate.value = true
  probeDialog.value = true
  probeLoading.value = true
  try {
    const body = unwrap(await props.api.get('plugin/SubtitleTranslator/probe', {
      params: { id: item.id, path: item.path },
    }))
    if (body.success === false) {
      probeError.value = body.message || '探测失败'
    } else {
      probeStreams.value = body.streams || []
      probeVideo.value = body.video || item.path || ''
      probeMessage.value = body.message || ''
      probeExisting.value = body.existing || 0
      probeFiles.value = body.files || 1
      forceRetranslate.value = true
    }
  } catch (err) {
    probeError.value = err?.message || '探测失败'
  } finally {
    probeLoading.value = false
  }
}

async function confirmTranslate() {
  const item = probeItem.value
  if (!item) return
  starting.value = true
  probeError.value = ''
  try {
    const payload = {
      id: item.id, path: item.path, title: item.title,
      force: forceRetranslate.value || probeExisting.value === 0,
    }
    if (selectedTrack.value >= 0) payload.stream_index = selectedTrack.value
    const body = unwrap(await props.api.post('plugin/SubtitleTranslator/translate', payload))
    if (body.success === false) {
      probeError.value = body.message || '启动失败'
      return
    }
    probeDialog.value = false
    lastResult.value = null
    startedInfo.value = {
      title: item.title,
      task_id: body.task_id,
      position: body.position || 1,
      files: body.files || 1,
      eta_low: body.eta_low || 3,
      eta_high: body.eta_high || 6,
    }
    startedDialog.value = true
    await fetchStatus()
  } catch (err) {
    probeError.value = err?.message || '启动失败'
  } finally {
    starting.value = false
  }
}

async function stop() {
  try {
    await props.api.post('plugin/SubtitleTranslator/stop', {})
    await fetchStatus()
  } catch (err) {
    error.value = err?.message || '停止失败'
  }
}

async function fetchStatus() {
  try {
    const body = unwrap(await props.api.get('plugin/SubtitleTranslator/status'))
    const cur = body.current || null
    current.value = cur
    queue.value = body.queue || []
    history.value = body.history || []

    const running = !!cur && (cur.state === 'running' || cur.state === 'queued')
    if (running) {
      hadTask = true
      ensurePolling()
    } else if (hadTask) {
      // 任务刚结束：刷新列表让徽章变成「已有中文」，并把结果留在页面上
      hadTask = false
      stopPolling()
      lastResult.value = (body.history || [])[0] || null
      search()
    }
  } catch (err) {
    // 轮询失败不打扰用户
  }
}

function ensurePolling() {
  if (timer) return
  timer = setInterval(fetchStatus, 3000)
}

function stopPolling() {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}

onMounted(async () => {
  search()
  await fetchStatus()
  // 页面刚打开时，如果十分钟内刚跑完一次任务，也把结果亮出来
  if (!current.value && !lastResult.value && history.value.length) {
    const latest = history.value[0]
    const ago = Date.now() / 1000 - (latest.finished_ts || 0)
    if (ago >= 0 && ago < 600) lastResult.value = latest
  }
})

onBeforeUnmount(stopPolling)
</script>

<style scoped>
.subtr-page { padding: 4px; }
.page-card { border-radius: 14px; }
.head-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.head-title { font-size: 18px; font-weight: 700; }
.head-sub { font-size: 12px; opacity: 0.65; margin-top: 2px; }
.task-strip {
  padding: 10px 12px;
  border-radius: 10px;
  background: rgba(var(--v-theme-primary), 0.07);
  border: 1px solid rgba(var(--v-theme-primary), 0.18);
}
.task-head { display: flex; align-items: center; gap: 8px; }
.task-title { font-size: 13px; font-weight: 600; }
.task-meta {
  display: flex;
  gap: 14px;
  flex-wrap: wrap;
  font-size: 12px;
  opacity: 0.75;
}
.task-file { max-width: 42%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.queue-line { font-size: 12px; opacity: 0.65; margin-top: 6px; }
.toolbar { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
.search-field { flex: 1 1 260px; min-width: 200px; }
.type-field { width: 130px; flex: 0 0 auto; }
.section-line { display: flex; align-items: center; gap: 8px; margin: 18px 0 10px; }
.section-title { font-size: 14px; font-weight: 700; }
.section-count { font-size: 12px; opacity: 0.6; }
.result-grid, .skeleton-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(148px, 1fr));
  gap: 16px;
}
.card {
  border-radius: 12px;
  overflow: hidden;
  background: rgba(var(--v-theme-surface-variant), 0.28);
  display: flex;
  flex-direction: column;
  transition: transform 0.16s ease, box-shadow 0.16s ease;
}
.card:hover { transform: translateY(-3px); box-shadow: 0 10px 22px rgba(0, 0, 0, 0.16); }
.poster-wrap { position: relative; aspect-ratio: 2 / 3; background: rgba(128, 128, 128, 0.15); }
.poster-wrap :deep(.poster), .poster { position: absolute; inset: 0; width: 100%; height: 100%; }
.poster-loading {
  position: absolute;
  inset: 0;
  background: linear-gradient(100deg, rgba(128,128,128,0.12) 30%, rgba(128,128,128,0.22) 50%, rgba(128,128,128,0.12) 70%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
}
@keyframes shimmer { 0% { background-position: 150% 0; } 100% { background-position: -50% 0; } }
.poster-fallback { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; }
.poster-badge { position: absolute; top: 6px; left: 6px; }
.type-badge {
  position: absolute; top: 6px; right: 6px;
  font-size: 11px; padding: 1px 6px; border-radius: 6px;
  background: rgba(0, 0, 0, 0.55); color: #fff;
}
.card-body { padding: 8px 9px 4px; flex: 1; }
.title-line {
  font-size: 13px; font-weight: 600; line-height: 1.35;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
  overflow: hidden; min-height: 35px;
}
.meta-line { font-size: 11px; opacity: 0.6; margin-top: 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.chip-line { display: flex; gap: 4px; margin-top: 6px; flex-wrap: wrap; }
.card-actions { padding: 0 9px 9px; }
.empty-tip { text-align: center; padding: 40px 0; opacity: 0.55; font-size: 13px; }
.force-row { margin-bottom: 6px; }
.track-label { font-size: 13px; }
.track-title { opacity: 0.65; margin-left: 6px; }
.started-head { display: flex; align-items: center; gap: 8px; }
.started-title { font-size: 16px; font-weight: 700; }
.eta-line { font-size: 13px; line-height: 1.7; }
.eta-line b { color: rgb(var(--v-theme-primary)); }
.queue-hint { font-size: 12px; opacity: 0.75; margin-top: 10px; }
.live-box {
  margin-top: 12px;
  padding: 10px;
  border-radius: 8px;
  background: rgba(var(--v-theme-primary), 0.06);
}
.stage-row {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 6px;
}
.stage-chip {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(128, 128, 128, 0.14);
  opacity: 0.55;
  transition: all 0.2s ease;
}
.stage-chip.stage-active {
  background: rgba(var(--v-theme-primary), 0.18);
  color: rgb(var(--v-theme-primary));
  opacity: 1;
  font-weight: 600;
}
.stage-chip.stage-done {
  background: rgba(var(--v-theme-success), 0.16);
  color: rgb(var(--v-theme-success));
  opacity: 0.9;
}
.live-row { display: flex; gap: 12px; flex-wrap: wrap; font-size: 12px; opacity: 0.8; }
.live-stage { opacity: 1; }
.stage-text { font-weight: 600; color: rgb(var(--v-theme-primary)); }
.live-file { max-width: 60%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.history-item { display: flex; align-items: center; gap: 10px; padding: 8px 0; border-bottom: 1px solid rgba(128,128,128,0.18); }
.history-title { font-size: 13px; font-weight: 600; max-width: 30%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.history-meta { font-size: 12px; opacity: 0.7; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.history-time { font-size: 11px; opacity: 0.5; }
</style>
