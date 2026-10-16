# Weatherglass · Vue 3

一个放在玻璃箱中的可交互天气世界。原始 3D 山体、瀑布、水面、植被、动物、云、雨雪、雾气、玻璃与声音保留，控制界面重构为 Vue 3 单文件组件。

参考作品：https://claude.ai/artifact/3bhygX763cPdpcHQYmfrPk

## 本地开发

使用 Node.js 24 LTS（最低 22.12）：

```sh
npm install
npm run dev
```

打开 http://127.0.0.1:4173 ，Windows 下也可以双击 `启动预览.cmd`。

```sh
npm run check    # 时间、季节、天气状态等行为检查
npm run build    # 构建静态网站到 dist/
npm run preview  # 预览构建结果
```

## GitHub Pages

目标仓库：`iyuangang/weatherglass-vue`。

1. 在仓库 **Settings → Pages → Build and deployment** 中将 **Source** 设为 **GitHub Actions**。
2. 推送代码到 `main` 分支，`.github/workflows/deploy.yml` 会安装锁定的依赖、检查、构建并部署。
3. 在 Actions 查看部署结果；访问 https://iyuangang.github.io/weatherglass-vue/ 。

Vite 使用 `base: './'`，生成的资源地址兼容仓库子目录、用户主页和自定义域名。网站不需要服务器、Claude、ChatGPT 登录或外部 API。

## 操作

- 页面默认启用真实世界联动：自动获取位置、读取当前天气，并同步当地日期、时间、季节、太阳与月亮。
- 左上角天气栏可查看数据、搜索城市、切换定位方式以及暂停/恢复联动。调整时间轴、季节、温度或编辑天气时会转入手动探索。

- `1` 手：拖动、抛动云朵；按住不动挤出雨水；晃动形成雷暴；拖动太阳改变时间。
- `2` 风：在场景内划动吹风。
- `3` 云：在天空按住凝结云朵。
- `4` 雾：向山谷涂抹雾气。
- `5` 擦拭：擦掉玻璃上的凝结水汽。
- 左下角播放或暂停昼夜，点击或拖动时间轴；方向键微调 15 分钟，PageUp / PageDown 调整一小时，Home / End 转向黎明 / 黄昏。
- 右下角点击季节、拖动圆环或滚轮微调；方向键微调，Enter / 空格 / PageUp 切到下一季，PageDown 回到上一季。
- `U` 显示或隐藏界面；Esc 收起面板或恢复界面；右上角切换声音和全屏。
- 手机布局通过 Climate 按钮展开时间与季节面板；提示进度和声音偏好保存在浏览器中。

## 源码结构

```text
src/
  App.vue                       页面与场景生命周期
  components/                   Vue 控件、转盘、时间轴、提示
  composables/useWeatherglass.js Vue 状态与场景 API 桥接
  composables/usePointerDrag.js  指针捕获与拖拽清理
  engine/reference-engine.js    原始 Three.js / 程序化场景，适配启动与销毁
  styles/original.css           保留原始样式
  ui/                           图标、文案与天气计算
tests/                          行为检查
```

3D 对象保留在引擎内部，不经过 Vue 深度响应式代理。Vue 管理控件与可见状态；渲染循环通过轻量订阅更新控件，卸载时停止动画并释放监听、音频与 GPU 资源。场景中的动态画面和自适应画质会随运行时间和设备性能变化。

## 真实天气与天文

首次打开会尝试浏览器设备定位，需要用户允许位置权限。未授权、设备不支持或定位失败时，会回退到 GeoJS 的 IP 粗略定位，并在界面标注“估算”及可用的精度范围。代理或 VPN 可能使估算位置偏离所在地，可通过“使用设备定位”或城市搜索纠正。设备坐标取整到约 1 公里，IP 坐标取整到约 10 公里；不保存 IP 或 ASN。

- **天气：** [Open-Meteo](https://open-meteo.com/en/docs) 的当前模型天气，每 15 分钟刷新，显示数据时间。温度、湿度、云量、风向、风速、降水及雨雪雾/雷暴状态会驱动场景。视觉强度按微缩景观缩放，面板保留 API 原始单位。
- **日期与时间：** 使用设备当前时间和位置对应的 IANA 时区；跨日、夏令时和半小时时区均按当地时间显示。
- **季节：** 采用气象四季（北半球 3–5 月为春季，以此类推），南半球相位反转，场景颜色连续过渡。
- **太阳与月亮：** 使用 [SunCalc 2](https://github.com/mourner/suncalc) 按日期与经纬度分别计算，不将月亮简单放在太阳对面。场景方向为 +X 东、+Y 上、−Z 北；界面方位角为正北 0°、顺时针增加，单位为度。同步太阳/月亮位置、昼夜光照、月相，并显示当地日出日落、月升月落；支持极昼、极夜和当天没有升落事件的情况。
- **手动探索：** 原有工具和控制方式保留；手动调整会暂停联动，点击“恢复实时”回到当地此刻。数据请求失败时保留明确标注的最近缓存（最多 3 小时）；天气不可用时不会伪造当前温度，日期与天文仍可更新。

上述功能在浏览器内完成，无后端、API 密钥或账号。天气、定位服务需要联网。添加 `?quality=low` 可使用低画质；添加 `&location=ip` 可显式只使用 IP 粗略定位。

新增源码：`src/services/weatherApi.js`、`src/services/astronomy.js`、`src/composables/useRealWorld.js`、`src/engine/realityDriver.js` 和 `src/components/RealWorldPanel.vue`。
