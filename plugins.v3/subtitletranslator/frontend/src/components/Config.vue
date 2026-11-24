<template>
  <div class="subtr-config">
    <v-card variant="outlined">
      <v-card-item>
        <v-card-title class="d-flex align-center">
          <v-icon class="mr-2" color="primary">mdi-cog</v-icon>
          字幕机翻配置
        </v-card-title>
      </v-card-item>

      <v-card-text>
        <v-alert v-if="error" type="error" variant="tonal" density="compact" class="mb-3">{{ error }}</v-alert>
        <v-alert v-if="message" type="success" variant="tonal" density="compact" class="mb-3">{{ message }}</v-alert>

        <div class="switch-row">
          <v-switch v-model="config.enabled" label="启用插件" color="primary" density="compact" hide-details inset />
          <v-switch v-model="config.notify" label="完成后通知" color="primary" density="compact" hide-details inset />
          <v-switch v-model="config.refresh_server" label="写回后刷新媒体服务器" color="primary" density="compact" hide-details inset />
        </div>

        <v-divider class="my-4" />

        <div class="grid-row">
          <v-select
            v-model="config.provider"
            :items="providerOptions"
            label="翻译服务商"
            density="compact"
            variant="outlined"
            hide-details
            @update:model-value="onProviderChange"
          />
          <v-text-field
            v-model="config.api_key"
            label="API Key"
            placeholder="sk-..."
            density="compact"
            variant="outlined"
            hide-details
            :append-inner-icon="showKey ? 'mdi-eye-off' : 'mdi-eye'"
            :type="showKey ? 'text' : 'password'"
            @click:append-inner="showKey = !showKey"
          />
        </div>

        <div class="grid-row mt-3">
          <v-autocomplete
            v-model="config.model"
            :items="models"
            :loading="loadingModels"
            label="模型"
            placeholder="点右侧按钮拉取，或直接输入模型名"
            density="compact"
            variant="outlined"
            hide-details
            clearable
            chips
            closable-chips
            :menu-props="{ maxHeight: 320 }"
            no-data-text="先填 Key 再拉取模型列表"
          />
          <v-btn
            color="secondary"
            variant="tonal"
            :loading="loadingModels"
            prepend-icon="mdi-cloud-download"
            @click="fetchModels"
          >
            拉取模型
          </v-btn>
        </div>

        <div class="grid-row mt-3">
          <v-text-field
            v-model="config.api_url"
            label="自定义接口地址（留空用服务商默认）"
            placeholder="https://api.deepseek.com"
            density="compact"
            variant="outlined"
            hide-details
          />
          <v-select
            v-model="config.output_mode"
            :items="outputOptions"
            label="输出模式"
            density="compact"
            variant="outlined"
            hide-details
          />
        </div>

        <div class="grid-row grid-3 mt-3">
          <v-text-field
            v-model.number="config.batch_size"
            label="每批行数"
            type="number"
            density="compact"
            variant="outlined"
            hide-details
          />
          <v-text-field
            v-model.number="config.delay"
            label="批次间隔（秒）"
            type="number"
            step="0.5"
            density="compact"
            variant="outlined"
            hide-details
          />
          <v-text-field
            v-model.number="config.retries"
            label="失败重试次数"
            type="number"
            density="compact"
            variant="outlined"
            hide-details
          />
        </div>

        <div class="grid-row mt-3">
          <v-textarea
            v-model="config.glossary"
            label="术语表（每行「原文=译文」，可留空）"
            placeholder="Sheldon=谢尔顿&#10;Westeros=维斯特洛"
            rows="3"
            density="compact"
            variant="outlined"
            hide-details
          />
          <div class="side-switch">
            <v-switch v-model="config.overwrite" label="覆盖已有中文字幕" color="warning" density="compact" hide-details inset />
            <div class="hint">默认跳过已有 <code>.zh.srt</code> 的文件</div>
          </div>
        </div>
      </v-card-text>

      <v-card-actions class="px-4 pb-4">
        <v-btn color="primary" :loading="saving" prepend-icon="mdi-content-save" @click="save">保存</v-btn>
      </v-card-actions>
    </v-card>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref, watch } from 'vue'

const props = defineProps({
  initialConfig: { type: Object, default: () => ({}) },
  api: { type: Object, default: () => ({}) },
})

const emit = defineEmits(['save', 'close', 'switch'])

const providerOptions = [
  { title: 'DeepSeek', value: 'deepseek' },
  { title: '硅基流动', value: 'siliconflow' },
  { title: '阿里云百炼', value: 'aliyun' },
  { title: '月之暗面 Kimi', value: 'moonshot' },
  { title: '智谱 BigModel', value: 'zhipu' },
  { title: 'OpenRouter', value: 'openrouter' },
  { title: 'Google Gemini', value: 'gemini' },
  { title: '自定义 OpenAI 兼容', value: 'custom' },
]

const outputOptions = [
  { title: '双语（译文在上、原文在下）', value: 'zh-en' },
  { title: '仅译文', value: 'zh' },
]

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
}

const config = reactive({ ...defaults })
const models = ref([])
const apiKeys = reactive({})
const loadingModels = ref(false)
const saving = ref(false)
const showKey = ref(false)
const error = ref('')
const message = ref('')

function unwrap(res) {
  if (!res) return {}
  if (res.data && typeof res.data === 'object' && res.success === undefined) return res.data
  return res
}

async function fetchModels() {
  error.value = ''
  message.value = ''
  loadingModels.value = true
  try {
    const body = unwrap(await props.api.post('plugin/SubtitleTranslator/models', {
      provider: config.provider,
      api_key: config.api_key,
      api_url: config.api_url,
    }))
    if (body.success === false) {
      error.value = body.message || '拉取失败'
      return
    }
    models.value = body.models || []
    message.value = body.message || `共 ${models.value.length} 个模型`
    if (!config.model && models.value.length) {
      config.model = models.value[0]
    }
  } catch (err) {
    error.value = err?.message || '拉取模型失败'
  } finally {
    loadingModels.value = false
  }
}

async function save() {
  saving.value = true
  error.value = ''
  message.value = ''
  try {
    emit('save', { ...config, api_keys: { ...apiKeys } })
    message.value = '已保存'
  } catch (err) {
    error.value = err?.message || '保存失败'
  } finally {
    saving.value = false
  }
}

function onProviderChange() {
  // 切服务商：换回该服务商自己的 Key，并重新拉一次模型
  config.model = ''
  models.value = []
  config.api_key = apiKeys[config.provider] || ''
  if (config.api_key) fetchModels()
}

watch(() => config.api_key, (value) => {
  if (config.provider) apiKeys[config.provider] = value
})

onMounted(async () => {
  Object.keys(defaults).forEach((key) => {
    if (props.initialConfig && props.initialConfig[key] !== undefined) {
      config[key] = props.initialConfig[key]
    }
  })
  const stored = props.initialConfig?.api_keys
  if (stored && typeof stored === 'object') {
    Object.keys(stored).forEach((key) => { apiKeys[key] = stored[key] })
  }
  // 老配置只有单一 api_key，归到当前服务商名下
  if (config.api_key && !apiKeys[config.provider]) {
    apiKeys[config.provider] = config.api_key
  }
  if (config.model) models.value = [config.model]
  if (config.api_key && !config.model) await fetchModels()
})
</script>

<style scoped>
.subtr-config {
  padding: 4px;
}
.switch-row {
  display: flex;
  gap: 24px;
  flex-wrap: wrap;
}
.grid-row {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 12px;
  align-items: start;
}
.grid-3 {
  grid-template-columns: repeat(3, 1fr);
}
.side-switch {
  padding-top: 8px;
}
.hint {
  font-size: 12px;
  opacity: 0.65;
  margin-top: 10px;
}
@media (max-width: 720px) {
  .grid-row,
  .grid-3 {
    grid-template-columns: 1fr;
  }
}
</style>
