// 构建占位入口：宿主只加载 remoteEntry.js 暴露的 Page / Config，
// 这里刻意不引入 vue，避免把宿主已有的 vue 运行时重复打进产物。
export {}
