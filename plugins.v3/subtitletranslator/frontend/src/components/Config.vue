<template>
  <section class="cfg">
    <!-- 头部：标题 + 未保存提示 + 保存 -->
    <header class="cfg-head">
      <div class="cfg-brand">
        <div class="cfg-logo"><v-icon icon="mdi-subtitles-outline" size="20" /></div>
        <div>
          <div class="cfg-crumb">MoviePilot · 插件</div>
          <h1 class="cfg-title">字幕机翻 · 设置</h1>
        </div>
      </div>
      <div class="cfg-actions">
        <span v-if="dirty" class="cfg-dirty"><v-icon icon="mdi-circle" size="8" color="warning" /> 有未保存的修改</span>
        <v-btn color="primary" variant="flat" :loading="saving" @click="save">
          <v-icon icon="mdi-content-save-outline" start />保存
        </v-btn>
        <v-btn icon="mdi-close" size="small" variant="text" :aria-label="'关闭'" @click="emit('close')" />
      </div>
    </header>

    <v-alert v-if="error" type="error" variant="tonal" density="compact" class="mx-4 mb-0">{{ error }}</v-alert>
    <v-alert v-if="message" type="success" variant="tonal" density="compact" class="mx-4 mb-0">{{ message }}</v-alert>

    <div class="cfg-body">
      <!-- 左侧导航 -->
      <nav class="cfg-nav">
        <button
          type="button"
          class="nav-item nav-item--global"
          :class="{ 'nav-item--active': active === 'global' }"
          @click="active = 'global'"
        >
          <v-icon icon="mdi-cog-outline" size="18" />
          <span class="nav-label">全局设置</span>
        </button>

        <div class="nav-heading">翻译服务商</div>
        <button
          v-for="provider in providerList"
          :key="provider.key"
          type="button"
          class="nav-item"
          :class="{ 'nav-item--active': active === provider.key }"
          @click="active = provider.key"
        >
          <span class="nav-dot" :class="{ 'nav-dot--on': !!apiKeys[provider.key] }" />
          <span class="nav-label">{{ provider.name }}</span>
          <span v-if="config.provider === provider.key" class="nav-current">当前</span>
          <span class="nav-sub">{{ modelsMap[provider.key] || '未配置' }}</span>
        </button>
      </nav>

      <!-- 右侧内容 -->
      <div class="cfg-content">
        <!-- 全局设置 -->
        <template v-if="active === 'global'">
          <div class="panel-head">
            <h2 class="panel-title">全局设置</h2>
            <p class="panel-desc">任务行为与翻译输出格式；服务商相关的密钥与模型在左侧逐个维护。</p>
          </div>

          <div class="switch-row">
            <v-switch v-model="config.enabled" label="启用插件" color="primary" density="compact" hide-details inset />
            <v-switch v-model="config.notify" label="完成后通知" color="primary" density="compact" hide-details inset />
            <v-switch v-model="config.refresh_server" label="写回后刷新媒体服务器" color="primary" density="compact" hide-details inset />
            <v-switch v-model="config.overwrite" label="总是重翻已有中文字幕" color="warning" density="compact" hide-details inset />
          </div>

          <div class="grid-2">
            <v-select
              v-model="config.output_mode"
              :items="outputOptions"
              label="输出模式"
              density="compact"
              variant="outlined"
              hide-details
            />
            <v-select
              v-model="config.provider"
              :items="providerOptions"
              label="当前使用的服务商"
              density="compact"
              variant="outlined"
              hide-details
            />
          </div>

          <div class="grid-3">
            <v-text-field v-model.number="config.batch_size" label="每批行数" type="number" density="compact" variant="outlined" hide-details />
            <v-text-field v-model.number="config.delay" label="批次间隔（秒）" type="number" step="0.5" density="compact" variant="outlined" hide-details />
            <v-text-field v-model.number="config.retries" label="失败重试次数" type="number" density="compact" variant="outlined" hide-details />
          </div>

          <v-textarea
            v-model="config.glossary"
            label="术语表（每行「原文=译文」，可留空）"
            placeholder="Sheldon=谢尔顿&#10;Westeros=维斯特洛"
            rows="4"
            density="compact"
            variant="outlined"
            hide-details
            class="mt-3"
          />

          <v-alert type="info" variant="tonal" density="compact" class="mt-4">
            切换「当前使用的服务商」后，翻译会使用该服务商下维护的密钥与模型。
          </v-alert>
        </template>

        <!-- 服务商详情 -->
        <template v-else-if="activeProvider">
          <div class="panel-head panel-head--row">
            <div>
              <h2 class="panel-title">
                <v-icon :icon="activeProvider.icon" size="20" class="mr-2" />{{ activeProvider.name }}
              </h2>
              <p class="panel-desc">{{ activeProvider.hint }}</p>
            </div>
            <v-btn
              v-if="config.provider !== activeProvider.key"
              size="small"
              variant="tonal"
              color="primary"
              prepend-icon="mdi-check-circle-outline"
              @click="config.provider = activeProvider.key"
            >
              设为当前
            </v-btn>
            <v-chip v-else size="small" color="primary" variant="flat">当前使用中</v-chip>
          </div>

          <div class="grid-2">
            <v-text-field
              v-model="activeKey"
              :label="activeProvider.key === 'custom' ? 'API Key（可留空）' : 'API Key'"
              placeholder="sk-..."
              density="compact"
              variant="outlined"
              hide-details
              :type="showKey ? 'text' : 'password'"
              :append-inner-icon="showKey ? 'mdi-eye-off' : 'mdi-eye'"
              @click:append-inner="showKey = !showKey"
            />
            <v-text-field
              v-model="activeUrl"
              label="接口地址（留空用服务商默认）"
              placeholder="https://api.deepseek.com"
              density="compact"
              variant="outlined"
              hide-details
            />
          </div>

          <div class="model-row mt-3">
            <v-autocomplete
              v-model="activeModel"
              :items="modelOptions"
              :loading="loadingModels"
              label="模型"
              placeholder="点「拉取模型」获取，或直接输入"
              density="compact"
              variant="outlined"
              hide-details
              clearable
              closable-chips
              :menu-props="{ maxHeight: 320 }"
              no-data-text="先填 Key 再拉取模型列表"
            />
            <v-btn
              color="secondary"
              variant="tonal"
              :loading="loadingModels"
              prepend-icon="mdi-cloud-download-outline"
              @click="fetchModels"
            >
              拉取模型
            </v-btn>
            <v-btn
              variant="text"
              :disabled="!activeKey && activeProvider.key !== 'custom'"
              prepend-icon="mdi-connection"
              :loading="testing"
              @click="testProvider"
            >
              验证
            </v-btn>
          </div>

          <div class="provider-status mt-3">
            <v-chip size="small" :color="apiKeys[activeProvider.key] ? 'success' : 'grey'" variant="tonal">
              {{ apiKeys[activeProvider.key] ? '已配置密钥' : '未配置密钥' }}
            </v-chip>
            <v-chip v-if="modelsMap[activeProvider.key]" size="small" variant="tonal">
              模型：{{ modelsMap[activeProvider.key] }}
            </v-chip>
            <v-btn
              v-if="apiKeys[activeProvider.key]"
              size="small"
              variant="text"
              color="error"
              @click="clearProvider"
            >
              清除该服务商配置
            </v-btn>
          </div>

          <v-alert v-if="activeProvider.key === 'gemini'" type="info" variant="tonal" density="compact" class="mt-4">
            Gemini 走原生接口，模型名形如 <code>gemini-2.5-flash</code>。
          </v-alert>
          <v-alert v-else-if="activeProvider.key === 'custom'" type="info" variant="tonal" density="compact" class="mt-4">
            自定义服务商需兼容 OpenAI 的 <code>/chat/completions</code> 接口；接口地址要填到 <code>/v1</code> 这一层。
          </v-alert>
        </template>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'

const props = defineProps({
  initialConfig: { type: Object, default: () => ({}) },
  api: { type: Object, default: () => ({}) },
})

const emit = defineEmits(['save', 'layout', 'close', 'switch'])

const PROVIDERS = [
  { key: 'deepseek', name: 'DeepSeek', icon: 'mdi-robot-outline', hint: '官方接口，字幕翻译性价比高，默认关闭思考模式。' },
  { key: 'siliconflow', name: '硅基流动', icon: 'mdi-cloud-outline', hint: '国内聚合平台，模型选择多。' },
  { key: 'aliyun', name: '阿里云百炼', icon: 'mdi-cloud-braces', hint: 'DashScope 兼容模式，qwen 系列。' },
  { key: 'moonshot', name: '月之暗面 Kimi', icon: 'mdi-moon-waning-crescent', hint: 'Kimi 长上下文，适合长片字幕。' },
  { key: 'zhipu', name: '智谱 BigModel', icon: 'mdi-lightning-bolt-outline', hint: 'GLM 系列，速度快。' },
  { key: 'openrouter', name: 'OpenRouter', icon: 'mdi-routes', hint: '聚合多家模型，需要代理时在系统里配置。' },
  { key: 'gemini', name: 'Google Gemini', icon: 'mdi-google', hint: '原生接口，国内访问通常需要代理。' },
  { key: 'custom', name: '自定义（OpenAI 兼容）', icon: 'mdi-server', hint: '任意兼容 OpenAI 的服务，如自建网关、Ollama。' },
]

const providerOptions = PROVIDERS.map(item => ({ title: item.name, value: item.key }))
const outputOptions = [
  { title: '双语（译文在上、原文在下）', value: 'zh-en' },
  { title: '仅译文', value: 'zh' },
]

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
}

const config = reactive({ ...defaults })
const apiKeys = reactive({})
const modelsMap = reactive({})
const providerUrls = reactive({})
const models = ref([])
const active = ref('global')
const showKey = ref(false)
const loadingModels = ref(false)
const testing = ref(false)
const saving = ref(false)
const error = ref('')
const message = ref('')
const snapshot = ref('')

const providerList = computed(() => PROVIDERS)
const activeProvider = computed(() => PROVIDERS.find(item => item.key === active.value) || null)

const activeKey = computed({
  get: () => apiKeys[active.value] || '',
  set: (value) => { apiKeys[active.value] = value },
})
const activeModel = computed({
  get: () => modelsMap[active.value] || '',
  set: (value) => { modelsMap[active.value] = value || '' },
})
const activeUrl = computed({
  get: () => providerUrls[active.value] || '',
  set: (value) => { providerUrls[active.value] = value || '' },
})
const modelOptions = computed(() => {
  const current = modelsMap[active.value]
  const list = models.value.slice()
  if (current && !list.includes(current)) list.unshift(current)
  return list
})

function unwrap(res) {
  if (!res) return {}
  if (res.data && typeof res.data === 'object' && res.success === undefined) return res.data
  return res
}

function payload() {
  const provider = config.provider
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
  snapshot.value = JSON.stringify(payload())
}

const dirty = computed(() => JSON.stringify(payload()) !== snapshot.value)

async function fetchModels() {
  error.value = ''
  message.value = ''
  loadingModels.value = true
  try {
    const body = unwrap(await props.api.post('plugin/SubtitleTranslator/models', {
      provider: active.value,
      api_key: activeKey.value,
      api_url: activeUrl.value,
    }))
    if (body.success === false) {
      error.value = body.message || '拉取失败'
      return
    }
    models.value = body.models || []
    message.value = body.message || `共 ${models.value.length} 个模型`
    if (!modelsMap[active.value] && models.value.length) modelsMap[active.value] = models.value[0]
  } catch (err) {
    error.value = err?.message || '拉取模型失败'
  } finally {
    loadingModels.value = false
  }
}

async function testProvider() {
  error.value = ''
  message.value = ''
  testing.value = true
  try {
    const body = unwrap(await props.api.post('plugin/SubtitleTranslator/models', {
      provider: active.value,
      api_key: activeKey.value,
      api_url: activeUrl.value,
    }))
    if (body.success === false) {
      error.value = `${activeProvider.value.name} 验证失败：${body.message || '未知原因'}`
    } else {
      message.value = `${activeProvider.value.name} 可用，返回 ${body.models?.length || 0} 个模型`
    }
  } catch (err) {
    error.value = err?.message || '验证失败'
  } finally {
    testing.value = false
  }
}

function clearProvider() {
  apiKeys[active.value] = ''
  modelsMap[active.value] = ''
  providerUrls[active.value] = ''
  models.value = []
  if (config.provider === active.value) {
    config.enabled = config.enabled
  }
  message.value = `已清除 ${activeProvider.value.name} 的配置（保存后生效）`
}

async function save() {
  saving.value = true
  error.value = ''
  message.value = ''
  try {
    emit('save', payload())
    snapshot.value = JSON.stringify(payload())
    message.value = '已保存'
  } catch (err) {
    error.value = err?.message || '保存失败'
  } finally {
    saving.value = false
  }
}

function loadFrom(conf) {
  Object.keys(defaults).forEach((key) => {
    if (conf && conf[key] !== undefined) config[key] = conf[key]
  })
  const keys = conf?.api_keys
  if (keys && typeof keys === 'object') Object.keys(keys).forEach((k) => { apiKeys[k] = keys[k] })
  if (conf?.api_key && !apiKeys[config.provider]) apiKeys[config.provider] = conf.api_key

  const saved = conf?.models
  if (saved && typeof saved === 'object') Object.keys(saved).forEach((k) => { modelsMap[k] = saved[k] })
  if (conf?.model && !modelsMap[config.provider]) modelsMap[config.provider] = conf.model

  const urls = conf?.provider_urls
  if (urls && typeof urls === 'object') Object.keys(urls).forEach((k) => { providerUrls[k] = urls[k] })
  if (conf?.api_url && !providerUrls[config.provider]) providerUrls[config.provider] = conf.api_url
}

watch(active, () => {
  models.value = modelsMap[active.value] ? [modelsMap[active.value]] : []
  error.value = ''
  message.value = ''
})

onMounted(() => {
  loadFrom(props.initialConfig || {})
  refreshSnapshot()
})
</script>

<style scoped>
/* 字号沿用参考插件的 rem 阶梯：1.05 标题 / .9 小节 / .85 主要文字 / .8 表单 /
   .76 说明 / .72 次要 / .7 极小。间距按 3/6/8/12/14/16/18/24 的节奏走。 */
.cfg {
  display: flex;
  flex-direction: column;
  min-height: 380px;
  color: rgb(var(--v-theme-on-surface));
  --cfg-line: rgba(var(--v-theme-on-surface), 0.1);
}
.cfg, .cfg * { box-sizing: border-box; }

/* 头部 */
.cfg-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  min-height: 64px;
  padding: 10px 18px;
  border-bottom: 1px solid var(--cfg-line);
}
.cfg-brand { display: flex; align-items: center; gap: 12px; min-width: 0; }
.cfg-logo {
  flex: 0 0 38px;
  width: 38px;
  height: 38px;
  display: grid;
  place-items: center;
  border-radius: 11px;
  background: rgba(var(--v-theme-primary), 0.12);
  color: rgb(var(--v-theme-primary));
}
.cfg-crumb { font-size: 0.68rem; line-height: 1.2; color: rgba(var(--v-theme-on-surface), 0.5); }
.cfg-title { margin: 2px 0 0; font-size: 1.05rem; font-weight: 700; line-height: 1.3; }
.cfg-actions { display: flex; align-items: center; gap: 8px; flex: 0 0 auto; }
.cfg-dirty {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.8rem;
  font-weight: 600;
  color: rgb(var(--v-theme-warning));
  white-space: nowrap;
}

/* 主体：左导航 + 右内容 */
.cfg-body { display: grid; grid-template-columns: 248px minmax(0, 1fr); flex: 1; min-height: 0; }
.cfg-nav {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 14px 12px 18px;
  border-right: 1px solid var(--cfg-line);
  overflow-y: auto;
  max-height: 62vh;
}

/* 分组标题：文字 + 分隔线，和参考插件一致 */
.nav-heading {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 14px 0 4px;
  padding: 0 10px;
  font-size: 0.7rem;
  font-weight: 600;
  color: rgba(var(--v-theme-on-surface), 0.48);
  white-space: nowrap;
}
.nav-heading::after { content: ""; flex: 1; height: 1px; background: rgba(var(--v-theme-on-surface), 0.12); }

/* 分组项（全局设置）用单行「图标 + 文字」，和服务商的两行布局分开，避免图标挤进点位列 */
.nav-item.nav-item--global {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 44px;
  padding: 0 12px;
  font-size: 0.85rem;
  font-weight: 600;
}
.nav-item.nav-item--global :deep(.v-icon) { flex: 0 0 18px; }

/* 导航项：两行布局（名称 / 模型），行高与内边距固定，避免长短名字导致参差 */
.nav-item {
  display: grid;
  grid-template-columns: 8px minmax(0, 1fr) auto;
  grid-template-areas: "dot label extra" "dot sub sub";
  align-items: center;
  gap: 3px 10px;
  min-height: 46px;
  padding: 7px 12px;
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: rgba(var(--v-theme-on-surface), 0.78);
  text-align: left;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
}
.nav-item:hover { background: rgba(var(--v-theme-on-surface), 0.05); }
.nav-item--active { background: rgba(var(--v-theme-primary), 0.1); }
.nav-item--active .nav-label { color: rgb(var(--v-theme-primary)); }
.nav-dot {
  grid-area: dot;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgba(var(--v-theme-on-surface), 0.22);
}
.nav-dot--on { background: rgb(var(--v-theme-success)); box-shadow: 0 0 0 3px rgba(var(--v-theme-success), 0.16); }
.nav-label {
  grid-area: label;
  font-size: 0.85rem;
  font-weight: 600;
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.nav-current {
  grid-area: extra;
  justify-self: end;
  padding: 1px 7px;
  border-radius: 999px;
  background: rgba(var(--v-theme-primary), 0.14);
  color: rgb(var(--v-theme-primary));
  font-size: 0.68rem;
  font-weight: 600;
  line-height: 1.6;
  white-space: nowrap;
}
.nav-sub {
  grid-area: sub;
  padding-left: 18px;
  font-size: 0.72rem;
  line-height: 1.4;
  color: rgba(var(--v-theme-on-surface), 0.5);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 右侧内容 */
.cfg-content { min-width: 0; padding: 18px 20px 24px; overflow-y: auto; max-height: 62vh; }
.panel-head { margin-bottom: 16px; }
.panel-head--row { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
.panel-title { display: flex; align-items: center; gap: 8px; margin: 0; font-size: 1.05rem; font-weight: 700; line-height: 1.3; }
.panel-desc { margin: 4px 0 0; font-size: 0.76rem; line-height: 1.55; color: rgba(var(--v-theme-on-surface), 0.6); }

.switch-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px 24px;
  margin-bottom: 8px;
}
.grid-2 { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; margin-top: 14px; }
.grid-3 { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; margin-top: 14px; }
.model-row { display: grid; grid-template-columns: minmax(0, 1fr) auto auto; gap: 10px; align-items: center; margin-top: 14px; }
.provider-status { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-top: 14px; }

/* 表单与开关文字统一到 .83rem，避免有的粗大有的细小 */
.cfg :deep(.v-label) { font-size: 0.83rem; }
.cfg :deep(.v-btn) { font-size: 0.83rem; letter-spacing: 0; text-transform: none; }
.cfg :deep(.v-alert__content) { font-size: 0.83rem; line-height: 1.5; }
.cfg :deep(.v-alert) { padding: 10px 12px; }

@media (max-width: 860px) {
  .cfg-body { grid-template-columns: 1fr; }
  .cfg-nav { max-height: none; border-right: none; border-bottom: 1px solid var(--cfg-line); }
  .cfg-content { max-height: none; }
  .switch-row, .grid-2, .grid-3, .model-row { grid-template-columns: 1fr; }
}
</style>
