# 茧房悬挂播放器与资料卡（制作记录）

打开 [当前游戏](../index.html)。独立的[悬挂装饰验收页](../reviews/media-pendants.html)保留为制作记录。

## 本次呈现

- 使用用户提供的 `video player pendant 3d model.glb`，工程副本为 `public/assets/models/video-player-pendant.glb`（201,080 字节，10,571 个三角面）。三个播放器共享网格和材质；资料卡也从同一个模型派生，没有另生成模型。
- 原始模型没有 UV。新增正面投影 UV，将两张参考图分别贴在模型正面；边缘、背面与绳索使用暖米色毛毡材质。资料卡前面的旧播放三角／扬声器凸起压平，避免穿出用户画像贴图；保留同一外壳与原生绳结。
- 每间茧房中有 **三个播放器 + 一个数据面板**。替换原来的横向数据面板、背板与丝线框；新装饰用绳索连接到穹顶，避开出口。低垂装饰加入室内碰撞范围。
- 靠近播放器后，底部提示“E · 播放 视频 1／2／3”，按 E 在当前游戏页面的浮层中播放，不再点击模型打开新标签。重叠接近范围内选择最近的交互点。资料卡原有点击／靠近按 E 与数据地址跳转保持不变。

## 视频对应关系

| 播放器 | 用户提供的视频 |
|---|---|
| 视频 1 | `9c4ccb9feeb444b0acb833576a20792a.mp4` |
| 视频 2 | `150139109f0b585532bc72e3db3fb357.mp4` |
| 视频 3 | `e296f850d20b9970f047f954797cea8a.mp4` |

三个原文件均为 HEVC/hvc1。已制作 720×1280、H.264/avc1 + AAC、fast-start 的网页副本，放在 `public/assets/videos/`；原文件不变，工程中的原始归档在 `reviews/source-video/`，不加入 Git。转换记录见 `docs/reports/media-videos.json`。

视频仅在靠近并按 E 打开后加载；初始浮层中的 video 没有 src，preload 为 none。播放器仅接受配置中的三个 ID，视频源按当前工程相对路径解析，支持磁盘直开与 Pages 子路径。旧的独立 `media-video.html` 不再作为游戏交互入口。

浮层保留原生播放、暂停、进度、音量和全屏控制；在 E 操作中尝试直接播放，浏览器拒绝自动播放时可点击原生播放按钮。播放期间锁定角色移动／转场／镜头，暂停背景 3D 渲染并临时静音茧房环境声。按 Esc、点击关闭按钮或空白遮罩后，停止并卸载视频，恢复原位置、镜头和原环境声音偏好。关闭后需要重新按移动键，不会保留按住 W 的状态。

## 配置与源码

- `public/data/media-stage5a.js`：模型、贴图投影区域、吊牌位置与大小、视频文件对应关系。
- `src/world/media-pendants.js`：共用模型、两种正面材质、悬挂绳与室内碰撞。
- `src/systems/media-interaction.js`：保留资料卡的点击命中，播放器模型点击不再触发播放。
- `src/ui/video-viewer.js`、`src/ui/video-viewer.css`：页内视频浮层、惰性加载、关闭释放与焦点约束。
- `src/stage3-audio.js`：临时静音环境声，不改变声音开启偏好。
- `src/stage5a.js`：可选媒体交互入口；复用原有数据页跳转及原场景恢复。
- 原图保存在 `public/assets/references/pendant-{player,profile}.png`；WebP 材质副本保存在 `public/assets/textures/`。
- `scripts/prepare-media-videos.py --ffmpeg <ffmpeg 路径>` 可重建 H.264 副本；转换工具仅用于本地制作，不随游戏加载。

## 验证与验收

构建：`npm run build:media-review`。检查：`npm run test:media-review`。

自动检查已通过：一个资料卡、三个共用网格的播放器；23,064 个模型／绳索顶点留在穹顶以内；门口净空；贴图 UV 与数据卡压平；近距 E 提示与最近目标选择、点击视频无操作、页内播放不调用 window.open、Esc／关闭／遮罩卸载、移动与镜头隔离、背景 3D 渲染暂停、环境声恢复、自动播放拒绝与加载错误降级、三间房的数据目标、H.264 与 fast-start、磁盘路径和快照哈希。

`reviews/media-pendants-material-preview.png` 是离线 UV 贴合示意，不代替 WebGL 画面验收。自动检查使用真实场景与相机数学，替换 GPU 和音频输出；实际材质、镜头与视频播放请通过当前游戏查看。

建议先在自己的家中靠近三块播放器，依照底部 E 提示分别打开视频；确认始终留在游戏页面，Esc 关闭后位置不变、声音恢复且可立即继续走动。再到资料卡测试点击与 E 操作，最后进入两间可拜访的邻居茧房重复检查。
