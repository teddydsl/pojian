# 《破茧》阶段 5A 图标提示词包

> 用途：把「地图 / 天气 / 数据信息 / 任务成就 / 系统消息」五个新增模块所需的图标，拆成可直接投喂给生图模型的独立提示词。
> 生成合计 **44 枚功能图标（线稿）+ 5 张展示型位图（针毡质感）**，覆盖 `docs/TECH_PLAN.md` 中 5A 全部交互入口。

---

## 0. 先读这一段：怎么用这份文档

### 0.1 每条提示词的拼装方式

**每一条提示词都由两段拼接，不要只发主体描述**，否则风格会散：

```
{PREFIX} + , + {单条主体描述}
```

`{PREFIX}` 是第 1 节的功能图标风格母版。第 2 节每条都已经写好了主体描述，复制时把 `{PREFIX}` 替换成母版全文即可。

示例（map）：

```
Minimal monoline UI icon, uniform 2px stroke with rounded caps and joins, pure
black stroke on flat white background, no fill, no gradients, no shadows, flat 2D
front view, no perspective, single centered object, generous even padding inside a
square frame, crisp clean vector edges, high contrast, no text, a folded paper map
seen from directly above with two vertical fold creases, a small teardrop location
pin resting on the center crease, one short dashed path curving from the lower left
up to the pin
```

### 0.2 参数建议

| 项目 | 功能图标（44 枚） | 展示型位图（5 张） |
|---|---|---|
| 尺寸 | 1024 × 1024 | 1024 × 1024（`map-base` 用 1536 × 1024） |
| 比例 | 1:1 | 1:1 / 3:2 |
| 背景 | 纯白（后期抠成透明） | 浅米色无缝背景，不抠 |
| 质量档位 | medium 即可，别开 high | high |
| 单次生成数量 | 一次一张，不要一张图里排 9 个 | 一次一张 |
| 参考图 | 不需要 | 可传小刺猬三视图保持同源质感 |

> **重要**：绝大多数生图模型画不好「一张图里整齐排 9 个图标」——会串味、线宽不一、还带编号。**必须一次一张**。

### 0.3 生成后的后处理（这步不能省）

生图模型出的是位图，24px 的界面图标直接塞进去一定糊。标准流程：

1. **抠底**：白底 → 透明。用「按白色阈值」或直接下一步矢量化跳过。
2. **矢量化**：`vtracer --colormode bw --mode spline`，或 Illustrator「图像描摹」→ 黑白 / 阈值 128 / 转角 75% / 噪点 25px。
3. **缩到 24×24 实测**：在 16px 下糊成一团的，就砍掉内部小元素（比如徽章的星、时钟的刻度）。
4. **统一网格**：viewBox `0 0 24 24`，四周留 2px 安全边，描边统一改 `stroke="currentColor"`、`stroke-width="1.75"`、`stroke-linecap="round"`、`stroke-linejoin="round"`。
5. **落盘**：`public/assets/icons/<module>/<name>.svg`，构建时合并成 `sprite.svg` 内联，用 `<use>` 引用。

### 0.4 验收标准（5 条，逐张过）

- [ ] 纯黑单色，无填色、无渐变、无投影
- [ ] 所有描边粗细一致，圆头圆角
- [ ] 画面里只有一个主体，没有卡片底、没有方框背景、没有文字
- [ ] 缩到 24px 仍能一眼认出是什么
- [ ] 和同模块其他图标并排时，视觉重量接近

### 0.5 已知的模型翻车点（写进负面提示词里防）

- 自动加「圆角方形卡片底」和「柔和投影」→ 必须禁止
- 自动上色成扁平彩色图标 → 必须写死 pure black monoline
- 线宽忽粗忽细、部分描边带毛笔感 → 必须写 uniform 2px stroke
- 一张图里画出 4 个变体凑数 → 必须写 single centered object
- 擅自加字母、数字、假文字 → 必须写 no text

---

## 1. 风格母版

### 1.1 功能图标前缀 `{PREFIX}`（44 枚通用）

```
Minimal monoline UI icon, uniform 2px stroke with rounded caps and joins, pure
black stroke on flat white background, no fill, no gradients, no shadows, flat 2D
front view, no perspective, single centered object, generous even padding inside a
square frame, crisp clean vector edges, high contrast, no text
```

### 1.2 负面提示词（Negative prompt）

```
color, gradient, drop shadow, glow, 3D render, isometric, photorealistic, texture,
noise, paper grain, watermark, background color, solid fill, card background,
rounded rectangle backdrop, multiple objects, icon set, grid of icons, mockup,
device frame, text, letters, numbers, logo, signature, sketch lines, hatching,
uneven stroke width, calligraphy, blurry, low contrast
```

### 1.3 中文模型的替代前缀

如果你的模型对中文更敏感（即梦、可图、Seedream 等），用下面这段代替 `{PREFIX}`，第 2 节的主体描述可以直接用每条的「画什么」那句中译：

```
极简单线条 UI 图标，统一 2px 粗细、圆头圆角描边，纯黑色描边，纯白背景，
不填色、无渐变、无投影，正视图平面 2D，无透视，画面只有一个主体居中，
四周留白均匀，边缘干净锐利，不要任何文字
```

中文负面词：

```
彩色、渐变、投影、发光、3D、等距视角、写实、材质纹理、噪点、纸纹、水印、
卡片底、圆角背景、多个物体、图标合集、九宫格、样机、手机外框、文字、字母、
数字、草图线、排线、描边粗细不一、书法感、模糊、低对比
```

---

## 2. 功能图标提示词（44 枚）

每条格式：**编号 · 文件名 · 用途 → 画什么（英文主体描述，直接接在 `{PREFIX}` 后）→ 避免**

### 2.1 地图导航（9 枚）

落盘目录：`public/assets/icons/map/`

---

**01 · `map` · 地图入口**

画什么：
```
a folded paper map seen from directly above with two vertical fold creases, a small
teardrop location pin resting on the center crease, one short dashed path curving
from the lower left up to the pin
```

避免：真实国家或大陆轮廓、地名文字、罗盘指针。

---

**02 · `burrow` · 我的树洞**

画什么：
```
a rounded tree trunk cross section with a soft arched opening at the bottom center,
three concentric arcs above the opening suggesting a hollow interior, a tiny two
leaf sprout growing on the upper left of the trunk
```

避免：写实树皮纹理、盘根错节的树根、整棵树的树枝。

---

**03 · `cocoon-marker` · 茧房标记**

画什么：
```
a teardrop shaped cocoon hanging from a short straight stem, wrapped by three
horizontal banding lines, a small oval window in the middle of the body, hovering
above a thin horizontal ground line
```

避免：蝴蝶、毛毛虫、蜘蛛网。三间主题房共用这一枚，靠 `accent` 颜色区分，不要画三种。

---

**04 · `player-pin` · 玩家当前位置**

画什么：
```
a circular reticle ring with four short cardinal tick marks crossing it and a solid
dot in the exact center, one thin arc segment outside the ring at the upper right
suggesting a radar sweep
```

避免：水滴形地图针、军事准星、箭头指针。

---

**05 · `visited` · 已探索**

画什么：
```
a soft rounded check mark enclosed by a dashed circular ring, the check slightly
heavier than the ring, the ring dashes evenly spaced with clear gaps
```

避免：实心圆填充、双层同心环、勾与环重叠粘连。

---

**06 · `gate-closed` · 门关闭 / 不可进入**

画什么：
```
a simple arched door outline with a round knob on its right edge, crossed by a
single diagonal slash running from the lower left to the upper right, both drawn at
the same stroke weight
```

避免：**锁头**（会和「私密」的 lock 撞车）、铁栅栏、警告三角。

---

**07 · `zoom-in` · 放大**

画什么：
```
a magnifying glass with a circular lens and a diagonal handle to the lower right,
a single plus sign centered inside the lens, handle attached at exactly 45 degrees
```

避免：镜头高光、玻璃反光、两个镜片。

---

**08 · `zoom-out` · 缩小**

画什么：
```
a magnifying glass with a circular lens and a diagonal handle to the lower right,
a single minus sign centered inside the lens, handle attached at exactly 45 degrees
```

避免：与 `zoom-in` 除加减号外任何差异——这两枚必须完全同构。

---

**09 · `recenter` · 复位居中**

画什么：
```
four L shaped corner brackets forming an implied square, a small filled dot dead
center, two short axis ticks crossing at the dot
```

避免：十字准星过长、四角括号连成完整方框。

---

### 2.2 天气状态（6 枚）

落盘目录：`public/assets/icons/weather/`

> 顶栏天气入口直接用「当前天气」那一枚，不另画独立的 weather 图形。6 枚必须同构：同画布占比、同视觉重量。

---

**10 · `clear` · 晴**

画什么：
```
a full circular sun disc drawn as an outline, eight straight rays of equal length
evenly spaced around it, rays detached from the disc with a clear gap
```

避免：实心太阳、光芒长短不一、云朵（晴就是纯太阳）。

---

**11 · `cloudy` · 多云**

画什么：
```
two overlapping cloud shapes, the front cloud fully drawn, the back cloud partially
hidden behind it, three short horizontal line segments floating to the left of the
cloud mass
```

避免：云朵内部纹理、云和太阳同时出现。

---

**12 · `rain` · 雨**

画什么：
```
a single cloud outline with three evenly spaced slanted raindrops below it, each
drop a short rounded slanted line leaning the same direction
```

避免：雨滴画成水滴形状、雨线过长穿出画面、云下加闪电。

---

**13 · `fog` · 雾**

画什么：
```
four horizontal wavy lines stacked with even vertical gaps and decreasing width
from bottom to top, the top line offset slightly to the left
```

避免：波浪振幅过大、加云朵、加人形剪影。

---

**14 · `wind` · 风**

画什么：
```
three horizontal lines with hooked curled ends at the right side, each hook curving
upward, the lines decreasing in length from top to bottom
```

避免：龙卷风旋涡、树叶飞舞、多条线纠缠交叉。

---

**15 · `night` · 夜**

画什么：
```
a crescent moon opening to the right formed by two circular arcs, three small four
pointed sparkles placed at the upper right
```

避免：月亮上画人脸、云朵遮挡、星星画成五角星。

---

### 2.3 数据信息（8 枚）

落盘目录：`public/assets/icons/data/`

---

**16 · `profile` · 个人数据**

画什么：
```
a bust silhouette of a circular head above a rounded shoulder arc, enclosed inside
a rounded square frame that has one corner notch cut out at the upper right
```

避免：写实人脸五官、性别特征、身份证卡片感。

---

**17 · `history` · 浏览过列表**

画什么：
```
two overlapping rounded rectangular cards, the front card fully drawn and the back
card partially hidden behind and offset to the upper right, three short horizontal
lines on the front card
```

避免：时钟（会与 `clock` 撞车）、地图路径（会与 `map` 撞车）、纸张褶皱。

---

**18 · `friends` · 好友列表**

画什么：
```
two overlapping bust silhouettes of circular heads above rounded shoulder arcs, the
front one fully drawn, the back one partially hidden behind and offset to the upper
right, both sharing the same baseline
```

避免：三个以上人形、握手、心形。

---

**19 · `avatar-frame` · 头像框（空态占位）**

画什么：
```
a rounded square frame containing a small circular head above a short shoulder arc,
with a small circular dot notch at the lower right corner of the frame
```

避免：装饰花纹、花边框、上传箭头。

---

**20 · `eye` · 公开**

画什么：
```
an almond shaped eye outline with a circular iris and a solid pupil inside, one
short lash tick above the center of the upper lid
```

避免：写实睫毛、眉毛、双眼。

---

**21 · `lock` · 私密**

画什么：
```
a closed padlock with a rounded square body and a shackle arch on top, a small
keyhole shape in the center of the body
```

避免：钥匙、链条、与 `gate-closed` 的门形混淆。

---

**22 · `clock` · 浏览时间**

画什么：
```
a clock face circle with two hands pointing at ten past ten, a slightly longer tick
mark at the twelve o'clock position, no numerals or dots around the rim
```

避免：数字刻度、秒针、闹钟铃铛。

---

**23 · `knock` · 邀请访客**

画什么：
```
a rounded door outline with a small circular knocker ring on its right half, two
short motion arcs to the right of the ring indicating a knock
```

避免：门把手球体、敲门的手、与 `gate-closed` 相同的斜杠。

---

### 2.4 任务成就（8 枚）

落盘目录：`public/assets/icons/quest/`

---

**24 · `trophy` · 成就入口**

画什么：
```
a trophy cup with a wide rim, two semicircular side handles, a short stem and a
rounded rectangular base
```

避免：杯身里加星星或数字、飘带、写实金属反光。

---

**25 · `quest-person` · 找人（新手任务核心）**

画什么：
```
a bust silhouette of a circular head above a rounded shoulder arc, with a small
question mark floating at its upper right, question mark drawn at the same stroke
weight
```

避免：问号过大压住人形、放大镜、多人。

---

**26 · `quest-cocoon` · 探索房间**

画什么：
```
a teardrop shaped cocoon with three horizontal banding lines, wrapped by a dashed
elliptical orbit path, one small dot sitting on the orbit
```

避免：与 `cocoon-marker` 完全相同——这枚是「待探索」，必须带虚线轨道以示区别。

---

**27 · `quest-visit` · 拜访好友**

画什么：
```
a rounded door outline with a dot knob, a short rightward arrow beside the door at
mid height, arrow with a simple two stroke head
```

避免：双向箭头、两扇门并排、门里画人。

---

**28 · `progress` · 进行中**

画什么：
```
a circular progress ring where roughly sixty percent of the arc is drawn solid and
the remainder is dashed, a small dot marking the leading end of the solid arc
```

避免：满环、百分比数字、环形箭头。

---

**29 · `badge-frame` · 徽章底框**

画什么：
```
a scalloped circular medal base with an inner concentric circle inset, the center
left completely empty
```

避免：中心画内容（这一枚是底框，本体是第 45 条位图）、绶带、五角星。

---

**30 · `gift` · 可领奖励**

画什么：
```
a gift box slightly wider than tall with a horizontal lid band, a vertical ribbon
running down the front and a simple two loop bow on top
```

避免：盒子透视、包装纸花纹、礼物从盒中弹出的效果。

---

**31 · `check` · 已完成**

画什么：
```
a single bold rounded check mark, drawn heavier than surrounding icons, no
enclosure of any kind
```

避免：加圆环（会和 `visited` 撞车）、加背景色块。

---

### 2.5 系统消息（3 枚）

落盘目录：`public/assets/icons/message/`

> 消息列表里的「奖励到账 / 好友动态 / 任务完成」直接复用 `quest/` 下的 `gift`、`quest-person`、`check`，**不要另画**。

---

**32 · `message` · 消息入口**

画什么：
```
a rounded speech bubble with a small tail at its lower left, three short horizontal
lines inside the bubble
```

避免：感叹号、对话双方两个气泡、红点（未读红点用 CSS 画，不做进图标）。

---

**33 · `horn` · 系统公告**

画什么：
```
a megaphone tilted at 45 degrees with three short sound arcs radiating from its
mouth, a small handle below the cone
```

避免：喇叭上画文字、声波画成实心扇形、大喇叭扩音器过于写实。

---

**34 · `envelope` · 邀请来信**

画什么：
```
a closed envelope in a rounded rectangle, the flap drawn as two diagonal lines
meeting at the center top, a small circular seal at the flap tip
```

避免：信封里露出信纸、邮票、多个信封堆叠。

---

### 2.6 设置（4 枚）

落盘目录：`public/assets/icons/settings/`

> 这 4 枚是可选项。现有设置面板用文字按钮已经能读，替换成图标属于体验加分，不影响 5A 验收。

---

**35 · `sound` · 音效开关**

画什么：
```
a speaker cone with a small rectangular base, three progressively larger arcs
radiating to its right
```

避免：与 `horn` 撞车——扬声器要正对左侧、喇叭要 45 度斜置；不要加静音斜杠（静音态在代码里用 CSS 加）。

---

**36 · `panel` · 任务面板开关**

画什么：
```
a rounded rectangle divided by one vertical line into a narrow left column and a
wide right column, two short horizontal lines inside the right column
```

避免：三个以上分栏、窗口控制按钮、侧边栏里画图标。

---

**37 · `gauge` · 帧率**

画什么：
```
a semicircular gauge arc with three short tick marks and a needle pointing to the
upper right, a short horizontal baseline beneath the arc
```

避免：指针数字、表盘填色、与 `clock` 相同的整圆。

---

**38 · `broom` · 清空本机记录**

画什么：
```
a broom tilted at 45 degrees with a straight handle, a binding band, and three
angled bristle strokes fanning out at the lower end
```

避免：扫帚画成哈利波特飞帚、灰尘团、垃圾桶。

---

### 2.7 通用基础件（6 枚）

落盘目录：`public/assets/icons/ui/`

> 这 6 枚全局共用，任何面板都引用同一份，不要各画一套。

---

**39 · `close-x` · 关闭**

画什么：
```
two crossing diagonal lines of equal length centered in the frame, rounded caps,
the crossing point exactly at the center
```

避免：线条长度不等、加圆圈外框、红色。

---

**40 · `arrow-back` · 返回**

画什么：
```
a leftward pointing arrow with a horizontal shaft and a two stroke head, the shaft
ending in a rounded cap at the right
```

避免：与其他图标连成「返回上一页」的箭头加房子组合。

---

**41 · `chevron` · 展开 / 收起**

画什么：
```
a single V shaped chevron pointing downward, two strokes meeting at a rounded
vertex, centered
```

避免：双 V、加横线、三角形填充。

---

**42 · `retry` · 重试**

画什么：
```
a three quarter circular arc with a small arrowhead at the open end, the arc
opening facing the upper right
```

避免：两个完整同心圆、回收标志式的三角形箭头。

---

**43 · `info` · 提示**

画什么：
```
a circle outline with a small filled dot at the top center and a short vertical bar
below the dot
```

避免：字母 i（必须是几何图形，不是字体）、感叹号、蓝色。

---

**44 · `warn` · 警告**

画什么：
```
a triangle with clearly rounded corners, a short vertical bar in its center and a
small filled dot directly beneath the bar
```

避免：三角里画字母、红色、感叹号用字体。

---

## 3. 展示型位图提示词（5 张）

这 5 张不进 24px 网格，用于徽章展示、地图底图、列表空态。它们是全站唯一应该带「针毡质感」的部分。

### 3.1 位图风格母版 `{FELT_PREFIX}`

```
Handmade needle felted wool miniature, soft fiber texture with visible individual
fibers and hand stitched seams, chunky rounded soft shapes, warm cream light brown
and muted forest green palette with a touch of dusty gold, soft diffused studio
light, subtle cool blue rim light on one edge and gentle warm amber light on the
other, shallow depth of field, macro photograph of a tiny crafted collectible toy,
centered on a clean light beige seamless background, soft natural shadow only under
the object, no harsh contrast
```

位图负面词：

```
plastic, resin, glossy, metallic, 3D render, CGI, cartoon outline, flat vector,
illustration, hard shadow, neon, oversaturated, busy background, clutter, text,
letters, watermark, human hands, scene with characters
```

中文模型版：

```
手工羊毛毡微缩作品，可见的纤维绒毛和手工缝线，圆润厚实的软造型，暖奶油色、
浅棕、灰绿主色，少量暗金色点缀，柔和漫射棚拍光，一侧极淡冷蓝边缘光、一侧暖橙
环境光，浅景深，微缩潮玩特写摄影，浅米色无缝背景，物体下方只有柔和自然投影
```

---

**45 · `badge-rookie` · 新手徽章「引路人」**

落盘：`public/assets/images/badge-rookie.png`（1024×1024，保留米色底，不抠图）

画什么：
```
{FELT_PREFIX}, a round felt medal, cream wool base with a thin blanket stitch
border in muted gold thread, a tiny felt hedgehog silhouette standing in the center
beside a small stitched winding path leading toward a miniature felt tree hollow, a
short felt ribbon tab folded at the top, the medal resting slightly tilted
```

避免：金属奖牌质感、写实文字、五角星、缎带垂到画面外。

---

**46 · `map-base` · 地图底图**

落盘：`public/assets/images/map-base.png`（1536×1024，正俯视）

画什么：
```
{FELT_PREFIX}, a top down flat lay of a small felt forest map, mossy green felt
patches layered unevenly, a winding tan wool path snaking from the lower left to the
upper right with stitching along both edges, three rounded tree hollow mounds placed
along the path, scattered tiny felt mushrooms and pebbles, no labels and no markers,
even soft lighting across the whole surface
```

避免：真实地形等高线、地名文字、罗盘、指北针、人物。标记由代码叠加，**底图必须干净**。

---

**47 · `empty-message` · 空消息箱**

落盘：`public/assets/images/empty-message.png`（1024×1024）

画什么：
```
{FELT_PREFIX}, a small open felt envelope lying flat and completely empty on a
cream surface, one dried felt leaf resting beside it, a single loose wool fiber
curling out of the envelope
```

避免：信封里露出纸、邮戳、多个信封。

---

**48 · `empty-friends` · 空好友位**

落盘：`public/assets/images/empty-friends.png`（1024×1024）

画什么：
```
{FELT_PREFIX}, two empty round felt seat cushions placed side by side on mossy felt
ground with a small clear gap between them, one tiny felt mushroom in the near
foreground, nothing sitting on either cushion
```

避免：人形、刺猬、脚印、三个以上坐垫。

---

**49 · `empty-history` · 空足迹**

落盘：`public/assets/images/empty-history.png`（1024×1024）

画什么：
```
{FELT_PREFIX}, a short trail of four felt paw prints receding into soft cream fog,
the nearest print crisp and clearly defined, each subsequent print softer and
lighter until the farthest is barely visible
```

避免：真实泥土脚印、雪地、动物、五种以上足迹。

---

## 4. 执行顺序建议

不要 49 张平铺并行，按这个顺序走，返工最少：

1. **先做 6 枚通用件**（39–44）—— 它们最简单，用来校准模型输出的线宽和画布占比是否稳定。
2. **再做 6 枚天气**（10–15）—— 同一族，一次性验证「同构」能不能被模型守住。
3. **再做地图 9 枚**（01–09）—— 结构最复杂，且能顺带验证 `gate-closed` 与 `lock` 是否真的不撞车。
4. **然后补齐数据信息 + 任务成就 + 消息 + 设置**（16–38，共 23 枚）。
5. **最后做 5 张位图** —— 位图质感需要反复试，放最后不阻塞前面。

## 5. 命名与落盘总表

```
public/assets/icons/
├─ map/        map, burrow, cocoon-marker, player-pin, visited, gate-closed,
│              zoom-in, zoom-out, recenter                        （9）
├─ weather/    clear, cloudy, rain, fog, wind, night               （6）
├─ data/       profile, history, friends, avatar-frame, eye, lock,
│              clock, knock                                        （8）
├─ quest/      trophy, quest-person, quest-cocoon, quest-visit,
│              progress, badge-frame, gift, check                  （8）
├─ message/    message, horn, envelope                             （3）
├─ settings/   sound, panel, gauge, broom                          （4）
└─ ui/         close-x, arrow-back, chevron, retry, info, warn     （6）

public/assets/images/
├─ badge-rookie.png
├─ map-base.png
├─ empty-message.png
├─ empty-friends.png
└─ empty-history.png                                               （5）
```

> 说明：`public/assets/icons/` 下现有的 `forest.svg` 与 `data.svg` 是 64×64 彩色 favicon（浏览器标签页用），**不属于这套功能图标体系，不要一起改、也不要塞进 sprite**。

## 6. 与 5A 验收的对应关系

| 截图反馈项 | 对应图标 | 数量 |
|---|---|---|
| 缺少地图图标 | `map/` 全部 | 9 |
| 缺少天气图标 | `weather/` 全部 | 6 |
| 缺少数据信息图标（个人数据 / 浏览列表 / 好友列表） | `data/` 全部 + 顶栏 3 枚入口 | 8 |
| 缺少任务成就（包装一个新手任务） | `quest/` 全部 + `badge-rookie` | 8 + 1 |
| 缺少系统消息 | `message/` 全部 + 3 张空态 | 3 + 3 |

合计：功能图标 44 枚 + 展示位图 5 张 = **49 个文件**。

如果时间紧张，先做最小可用集 18 枚即可让 5A 五个入口都有视觉落点：
`map`、`weather` 全 6 枚、`profile`、`history`、`friends`、`trophy`、`message`、`quest-person`、`gift`、`check`、`horn`、`close-x`。
