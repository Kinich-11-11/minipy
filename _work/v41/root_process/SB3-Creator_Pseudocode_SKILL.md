---
name: sb3-creator-pseudocode
description: >
  使用 CrispStrobe/sb3-creator（BrickWright）编写、检查、解释、修改和生成 Scratch 3
  项目的伪代码语法参考与工作流。适用于从需求编写 sb3-creator 伪代码、将 Scratch
  逻辑改写为 BrickWright 语法、检查语法错误、制作/修改 .sb3、解释自制积木、
  变量/列表/事件/控制/运动/外观/声音/侦测/运算/画笔/Music，以及需要时处理
  Arrays & Vectors、Planète Maths、bitops 和设备/硬件方言。
---

# SB3-Creator / BrickWright 伪代码 Skill

## 0. Skill 目的

本 Skill 用于处理 `CrispStrobe/sb3-creator` 项目的伪代码语言。

仓库：

- https://github.com/CrispStrobe/sb3-creator
- 在线编辑器：https://crispstrobe.github.io/sb3-creator/
- 编译器核心：`src/utils/sb3Creator.js`
- 快速语法参考：`src/components/SyntaxGuide.jsx`
- 示例：`examples/`
- 命令行编译器：`bin/sb3c.mjs`

主要能力：

1. 根据用户需求编写可被 sb3-creator 解析的伪代码。
2. 检查和修复 sb3-creator 伪代码语法。
3. 将 Scratch 积木逻辑转换成 sb3-creator 伪代码。
4. 阅读 sb3-creator 伪代码并解释对应 Scratch 积木。
5. 修改现有 `.sb3` 项目时，使用 sb3-creator 的真实语法，而不是自造伪代码格式。
6. 对自制积木、克隆体、广播、变量、列表等结构给出可实际编译的代码。
7. 必要时处理扩展语法与设备方言。
8. 在可运行仓库环境中，优先使用 `node bin/sb3c.mjs --check` 做真实语法验证。

---

# 1. 最高优先级原则：解析器源码才是最终规范

判断一种写法是否被支持时，证据优先级必须按以下顺序：

1. **当前版本 `src/utils/sb3Creator.js` 的实际解析逻辑**
2. `test/` 中对应功能的测试
3. `examples/` 中能够被测试套件实际编译的例子
4. `src/components/SyntaxGuide.jsx`
5. `README.md`
6. 本 Skill 中整理的语法

原因：

`SyntaxGuide.jsx` 的标题本身就是：

```text
View Quick Syntax Reference
```

它是快速参考，不保证列出当前 parser 的全部功能。

仓库 README 也明确说明：

```text
The compiler lives in src/utils/sb3Creator.js.
Open the in-app Syntax Reference for the full list.
```

但实际项目持续更新，因此如果本 Skill 与当前源码冲突：

> **永远以当前 `sb3Creator.js` 为准。**

不要为了匹配本 Skill 而忽略新版本 parser。

---

# 2. 使用本 Skill 时的标准工作流

处理 sb3-creator 任务时按以下顺序执行。

## 2.1 明确任务类型

先判断用户需要的是：

- 新建 Scratch 项目
- 修改现有 `.sb3`
- 单纯输出伪代码
- 检查伪代码
- 从 Scratch 积木描述转换
- 从其他代码转换为 Scratch
- 使用普通 Scratch
- 使用 TurboWarp / Scratch 扩展
- 使用 BrickWright 硬件/设备方言

不要把“普通 Scratch 伪代码”和“设备 C/MicroPython 方言”混在一起。

---

## 2.2 优先使用标准 Scratch 语法

如果用户没有要求硬件功能，优先使用普通 Scratch 对应的 BrickWright 语法：

```text
STAGE:
SPRITE Name:
GLOBAL x
LOCAL y
LIST items

WHEN flag clicked:
  ...

DEFINE block (arg):
  ...
```

不要无故使用：

```text
DEVICE
PIN
CLOCK
PART
ARRAY
bitand
RAW
```

等高级方言。

---

## 2.3 不要发明不存在的语法

禁止因为“看起来像 Python”就写：

```text
if x > 1:
while true:
x += 1
function test():
return x
```

应使用 BrickWright 语法：

```text
IF x > 1 THEN:
  ...

FOREVER:
  ...

change x by 1

DEFINE test:
  ...
```

---

## 2.4 可运行仓库时必须验证

如果手头有 sb3-creator 仓库，生成完整伪代码后优先运行：

```bash
node bin/sb3c.mjs --check program.txt
```

或者：

```bash
node bin/sb3c.mjs program.txt program.sb3
```

推荐：

```bash
npm test
```

仅在修改编译器本身、增加新语法或需要完整回归时运行测试套件。

如果 `--check` 报错：

1. 先修复语法；
2. 不要直接把未通过检查的代码交付；
3. 不要通过删除核心逻辑来“消除错误”。

---

# 3. 基础文件结构

## 3.1 舞台

```text
STAGE:
```

舞台对象名称固定对应 Scratch Stage。

示例：

```text
STAGE:

WHEN flag clicked:
  broadcast "开始"
```

---

## 3.2 角色

```text
SPRITE Player:
```

多个角色：

```text
SPRITE Player:

SPRITE Enemy:

SPRITE Bullet:
```

推荐每个角色的：

- `LOCAL`
- `LIST`
- `COSTUME`
- `SOUND`
- `WHEN`
- `DEFINE`

放在对应角色区域附近，便于阅读。

---

# 4. 缩进与代码块

BrickWright 使用缩进表达代码块。

推荐统一使用 **2 个空格**：

```text
WHEN flag clicked:
  FOREVER:
    IF score > 10 THEN:
      say "win"
```

可嵌套：

```text
WHEN flag clicked:
  REPEAT 10:
    IF hp > 0 THEN:
      move 10 steps
    ELSE:
      hide
```

不要写成没有缩进：

```text
WHEN flag clicked:
FOREVER:
move 10 steps
```

---

# 5. 注释

最稳妥、官方快速参考明确支持的注释：

```text
# 这是注释
```

例如：

```text
# 初始化
set score to 0
```

修改现有项目时，注释应该说明：

- 这个区域做什么
- 为什么需要这段逻辑
- 有哪些 Scratch 限制

不要用注释代替真正的积木逻辑。

---

# 6. 变量

## 6.1 全局变量

```text
GLOBAL score
GLOBAL hp
GLOBAL 当前页面
```

支持初始化：

```text
GLOBAL score = 0
GLOBAL speed = 5
GLOBAL playerName = "Player"
```

当前 parser 会把声明中的 `=` 拆分成变量名与初始值。

---

## 6.2 局部变量

角色作用域中：

```text
SPRITE Player:

LOCAL hp
LOCAL vx
LOCAL vy
```

支持初始化：

```text
LOCAL hp = 100
LOCAL vx = 0
LOCAL vy = 0
```

---

## 6.3 设置变量

```text
set score to 0
```

表达式：

```text
set score to score + 1
```

---

## 6.4 改变量

```text
change score by 1
change hp by -10
```

优先使用：

```text
change score by 1
```

而不是人为展开成：

```text
set score to score + 1
```

除非表达式确实更复杂。

---

# 7. 列表

## 7.1 声明

当前角色/舞台作用域：

```text
LIST items
```

明确全局：

```text
GLOBAL LIST items
```

明确局部：

```text
LOCAL LIST history
```

---

## 7.2 初始化

当前 parser 支持：

```text
GLOBAL LIST nums = [1, 2, 3]
LOCAL LIST names = ["A", "B", "C"]
```

如果需要最大兼容性，也可只声明后由绿旗脚本逐项初始化。

---

## 7.3 添加

```text
add 5 to nums
add score to history
```

---

## 7.4 删除全部

```text
delete all of nums
```

---

## 7.5 删除指定项

```text
delete 1 of nums
delete index of nums
```

---

## 7.6 插入

```text
insert 10 at 2 of nums
```

---

## 7.7 替换

```text
replace item 3 of nums with 99
```

---

## 7.8 显示/隐藏

```text
show list nums
hide list nums
```

---

## 7.9 列表 Reporter

```text
item 1 of nums
length of nums
```

示例：

```text
set x to item 1 of nums
set n to length of nums
```

---

## 7.10 查找项

```text
item # of "apple" in items
```

---

## 7.11 包含判断

```text
items contains "apple"
```

例如：

```text
IF items contains "apple" THEN:
  say "有"
```

---

# 8. 事件

## 8.1 绿旗

标准推荐：

```text
WHEN flag clicked:
```

当前 parser 还兼容：

```text
WHEN started:
WHEN powered on:
```

普通 Scratch 项目优先使用：

```text
WHEN flag clicked:
```

设备目标或需要与其他 BrickWright reader 往返时，可保留其 canonical spelling。

---

## 8.2 按键

```text
WHEN space key pressed:
WHEN a key pressed:
WHEN left arrow key pressed:
WHEN right arrow key pressed:
WHEN up arrow key pressed:
WHEN down arrow key pressed:
```

---

## 8.3 点击角色

```text
WHEN sprite clicked:
```

部分 parser 版本也接受：

```text
WHEN this sprite clicked:
```

推荐使用 `WHEN sprite clicked:`。

---

## 8.4 接收广播

```text
WHEN I receive "go":
```

---

## 8.5 克隆体启动

```text
WHEN I start as a clone:
```

---

# 9. 广播

## 9.1 普通广播

```text
broadcast "go"
```

---

## 9.2 广播并等待

```text
broadcast "go" and wait
```

---

# 10. 控制

## 10.1 永久重复

```text
FOREVER:
  ...
```

---

## 10.2 重复次数

```text
REPEAT 10:
  ...
```

表达式也可作为次数：

```text
REPEAT count:
  ...
```

---

## 10.3 重复直到

格式必须包含条件并以冒号结束：

```text
REPEAT UNTIL x > 5:
  ...
```

---

## 10.4 IF

标准形式：

```text
IF condition THEN:
  ...
```

例如：

```text
IF hp > 0 THEN:
  say "alive"
```

**不要省略 `THEN`。**

错误：

```text
IF hp > 0:
```

正确：

```text
IF hp > 0 THEN:
```

---

## 10.5 IF / ELSE

```text
IF score > 100 THEN:
  say "high"
ELSE:
  say "low"
```

`ELSE:` 与对应 `IF` 保持同级缩进。

---

## 10.6 等待

秒：

```text
wait 1 seconds
wait 0.5 secs
wait 2 s
```

当前 parser 还支持毫秒：

```text
wait 500 ms
wait 500 milliseconds
```

Scratch 内部最终存储为秒。

---

## 10.7 等到条件成立

```text
wait until score > 10
```

---

## 10.8 停止

```text
stop all
stop this script
stop other scripts in sprite
```

---

# 11. 克隆

## 11.1 创建自己的克隆体

```text
create clone of myself
```

---

## 11.2 创建其他角色克隆体

```text
create clone of Bullet
```

---

## 11.3 删除克隆体

```text
delete this clone
```

典型结构：

```text
WHEN I start as a clone:
  show
  REPEAT UNTIL touching edge:
    move 10 steps
  delete this clone
```

---

# 12. 运动

## 12.1 移动

```text
move 10 steps
```

---

## 12.2 转向

```text
turn right 15 degrees
turn left 15 degrees
```

部分 parser 版本接受：

```text
turn 15 degrees
```

普通项目优先写明确方向。

---

## 12.3 移到坐标

```text
go to x: 100 y: 50
```

---

## 12.4 移到对象

```text
go to mouse-pointer
go to random position
go to Player
```

---

## 12.5 滑行到坐标

```text
glide 1 secs to x: 100 y: 50
```

---

## 12.6 滑行到对象

```text
glide 1 secs to Player
glide 1 secs to mouse-pointer
```

---

## 12.7 改变坐标

```text
change x by 10
change y by -10
```

---

## 12.8 设置坐标

```text
set x to 100
set y to 50
```

---

## 12.9 指定方向

```text
point in direction 90
```

---

## 12.10 面向对象

```text
point towards mouse-pointer
point towards Player
```

---

## 12.11 碰到边缘反弹

```text
if on edge, bounce
```

---

## 12.12 旋转方式

使用 parser 当前支持的 Scratch rotation-style spelling，例如：

```text
set rotation style left-right
set rotation style all around
set rotation style don't rotate
```

若当前仓库版本对具体菜单字符串有变化，以 parser 为准。

---

# 13. 外观

## 13.1 说

```text
say "hello"
say "hello" for 2 seconds
```

---

## 13.2 思考

```text
think "hmm"
think "hmm" for 2 seconds
```

---

## 13.3 显示与隐藏

```text
show
hide
```

---

## 13.4 切换造型

```text
switch costume to walk
```

---

## 13.5 下一个造型

```text
next costume
```

---

## 13.6 背景

```text
switch backdrop to night
next backdrop
```

---

## 13.7 大小

```text
change size by 10
set size to 100
```

---

## 13.8 图形特效

Scratch 常见效果：

```text
change color effect by 10
set color effect to 50

change fisheye effect by 10
set fisheye effect to 50

change whirl effect by 10
set whirl effect to 50

change pixelate effect by 10
set pixelate effect to 50

change mosaic effect by 10
set mosaic effect to 50

change brightness effect by 10
set brightness effect to 50

change ghost effect by 10
set ghost effect to 50
```

清除：

```text
clear graphic effects
```

---

## 13.9 图层

```text
go to front
go to back

go forward 1 layers
go backward 1 layers
```

---

# 14. 声音

## 14.1 播放声音

```text
play sound "Meow"
```

---

## 14.2 播放直到结束

```text
play sound "Meow" until done
```

---

## 14.3 停止所有声音

```text
stop all sounds
```

---

## 14.4 音量

```text
change volume by -10
set volume to 100
```

---

# 15. 画笔 Pen

使用画笔语法时，编译器会添加对应扩展。

```text
clear
stamp

pen down
pen up
```

颜色：

```text
set pen color to #ff0000
```

参数：

```text
change pen color by 10
set pen color to 50

change pen saturation by 10
set pen saturation to 50

change pen brightness by 10
set pen brightness to 50

change pen transparency by 10
set pen transparency to 50
```

粗细：

```text
change pen size by 1
set pen size to 5
```

---

# 16. 侦测

## 16.1 询问

```text
ask "name?" and wait
```

结果 Reporter：

```text
answer
```

---

## 16.2 计时器

```text
reset timer
```

Reporter：

```text
timer
```

---

## 16.3 拖动模式

```text
set drag mode draggable
set drag mode not draggable
```

---

## 16.4 碰到对象

条件：

```text
touching Player
touching mouse-pointer
touching edge
```

例如：

```text
IF touching edge THEN:
  ...
```

---

## 16.5 碰到颜色

```text
touching color #ff0000
```

---

## 16.6 按键是否按下

```text
key space pressed?
key left arrow pressed?
```

---

## 16.7 鼠标

```text
mouse down?
mouse x
mouse y
```

---

## 16.8 距离

Quick Reference 明确支持：

```text
distance to mouse-pointer
```

角色目标可按当前 parser 的 sensing 规则使用；如需不确定目标写法，应先查 parser。

---

# 17. Reporter

常用值：

```text
x position
y position
direction
size
volume

mouse x
mouse y

answer
timer
loudness
username

costume number
costume name
backdrop number
backdrop name

days since 2000
```

---

# 18. 获取其他角色 / 舞台属性

例如：

```text
x position of Player
y position of Player
direction of Player
size of Player
volume of Player
costume number of Player
costume name of Player
```

舞台：

```text
backdrop number of Stage
backdrop name of Stage
```

---

# 19. 日期与时间

```text
current year
current month
current date
current hour
current minute
current second
day of week
```

示例：

```text
set 年 to current year
set 月 to current month
set 日 to current date
set 星期 to day of week
```

注意 Scratch 的 `day of week` 返回规则仍按 Scratch 本身定义处理。

---

# 20. 数学运算

## 20.1 四则运算

```text
a + b
a - b
a * b
a / b
```

支持括号：

```text
(a + b) * c
```

---

## 20.2 取模

```text
a mod b
```

---

## 20.3 随机

```text
pick random 1 to 10
```

---

## 20.4 四舍五入

```text
round x
```

---

## 20.5 数学函数

```text
abs of x
floor of x
ceiling of x
sqrt of x

sin of x
cos of x
tan of x

asin of x
acos of x
atan of x

ln of x
log of x
```

---

# 21. 字符串

## 21.1 连接

推荐：

```text
"Score: " join score
```

示例：

```text
say ("HP: " join hp)
```

如果当前 parser 对嵌套括号有特殊要求，以 parser/测试为准。

---

## 21.2 第 N 个字符

```text
letter 1 of "hello"
```

---

## 21.3 长度

```text
length of "hello"
```

当名字是已声明列表时：

```text
length of nums
```

通常会解析为列表长度。

---

# 22. 条件比较

支持：

```text
a < b
a > b
a = b
a <= b
a >= b
```

Scratch 没有原生 `<=` / `>=`，BrickWright parser 会通过等价逻辑表达。

普通条件：

```text
IF hp <= 0 THEN:
  ...
```

---

# 23. 布尔逻辑

```text
A and B
A or B
not A
```

示例：

```text
IF hp > 0 and energy > 0 THEN:
  ...
```

复杂逻辑必须用括号明确意图，避免依赖读者猜优先级：

```text
IF (a > 1 and b > 1) or c = 0 THEN:
  ...
```

---

# 24. 条件值与普通数值槽要区别

BrickWright 内部对：

- `parseValue`
- `parseCondition`

是分开的。

因此不要随意假设任何布尔表达式都可以放进普通数值变量槽。

不推荐：

```text
set flag to a > b
```

如果真实 parser/目标 Scratch 不能把它当普通值，应改成：

```text
IF a > b THEN:
  set flag to 1
ELSE:
  set flag to 0
```

这条规则尤其适用于需要稳定生成 `.sb3` 的任务。

---

# 25. 自制积木

## 25.1 普通自制积木

```text
DEFINE draw box (x) (y):
  go to x: x y: y
```

调用：

```text
draw box 100 50
```

---

## 25.2 数字 / 字符串参数

参数写作：

```text
(arg)
```

例如：

```text
DEFINE move to cell (row) (col):
  ...
```

---

## 25.3 布尔参数

参数写作：

```text
<flag>
```

例如：

```text
DEFINE draw item (x) <selected>:
  IF selected THEN:
    ...
```

---

## 25.4 FAST

```text
DEFINE FAST render:
  ...
```

等价于 Scratch 自制积木的：

```text
运行时不刷新屏幕
```

或 `warp = true`。

带参数：

```text
DEFINE FAST render item (x) (y):
  go to x: x y: y
```

---

## 25.5 调用参数中使用表达式

推荐把复杂参数用括号明确分组：

```text
draw box (px + 10) (py - 5)
```

不要把一个复杂表达式拆得导致 parser 无法识别参数边界。

---

# 26. 资源声明

## 26.1 SHAPE

角色第一造型可通过：

```text
SHAPE rect 80 50 #ff5533
SHAPE square 40 #ff5533
SHAPE circle 40 #00ff00
SHAPE ellipse 80 40 #00ff00
SHAPE triangle 50 #4c97ff
```

当前 parser 白名单还包含：

```text
polygon
art
```

例如 polygon 形式应根据当前 parser 期望的点坐标格式编写。

`SHAPE` 对舞台无效，舞台使用 `BACKDROP`。

---

## 26.2 COSTUME

最简单：

```text
COSTUME walk2
```

当前 parser 支持的主要形式包括：

```text
COSTUME <name>
COSTUME <name> tile "<text>" <bg> [fg]
COSTUME <name> label "<text>" [fg]
COSTUME <name> <shape> <dims...> [#hex]
COSTUME <name> art <registered-art-name>
```

例：

```text
COSTUME box rect 80 50 #ff0000
COSTUME ball circle 40 #00ff00
COSTUME num1 tile "1" #eeeeee #222222
COSTUME score label "100" #ffffff
```

`art` 依赖宿主预先注册的 vector artwork，不能假设任何名字都有效。

---

## 26.3 BACKDROP

```text
BACKDROP night
```

具体颜色/shape/art 扩展格式以当前 parser 为准。

---

## 26.4 SOUND

```text
SOUND jump
SOUND jump 660
```

README 明确指出最后的频率参数可选，常用于生成 tone。

---

# 27. Music 扩展

常用语法：

```text
play note 60 for 0.5 beats
play drum 1 for 0.5 beats
rest for 1 beats
set tempo to 120
```

当前 README 还说明支持 change tempo。

如需要使用 Music 的全部菜单值，查 `sb3Creator.js` 对应解析逻辑。

---

# 28. 位运算 bitops

这是 BrickWright 的扩展能力，不是 Scratch 原生普通运算符。

支持的中缀形式包括：

```text
a bitand b
a bitor b
a bitxor b
a shiftleft b
a shiftright b
```

以及 unary bitnot（具体写法以当前 parser 为准）。

**非常重要：位运算采用中缀形式。**

正确：

```text
value bitand 255
```

错误：

```text
bitand value 255
```

源码会专门警告前缀形式，因为它可能被误读成变量名。

---

# 29. 十六进制

硬件/位运算任务中可以使用类似：

```text
0xFF
0x80
0x3F
```

如果某目标生成器对常量格式有限制，应以对应 target 的测试结果为准。

---

# 30. Arrays & Vectors 扩展

注意：

> `LIST` 与 Arrays & Vectors 扩展中的 `array "name"` 不是同一种数据结构。

不要混用语义。

当前 parser 中可见的语法包括：

Reporter：

```text
item 0 of array "data"
pop from array "data"
length of array "data"
sum of array "data"
mean of array "data"
average of array "data"
smallest of array "data"
largest of array "data"
index of 5 in array "data"
reverse of array "data"
flatten of array "data"
sort of array "data" ascending
sort of array "data" descending
slice of array "data" from 0 to 10
array "data" as text
```

二维：

```text
item row 1 col 2 of array "matrix"
transpose of array "matrix"
reshape array "matrix" to ...
```

高阶操作：

```text
map "..." over array "data"
filter array "data" by "..."
reduce array "data" with "..." from 0
```

命令积木的 decompiler 形式包括：

```text
new array "data"
new array "data" = range 1 to 10
push 5 to array "data"
set item 0 of array "data" to 5
insert 5 at 0 of array "data"
remove item 0 of array "data"
delete array "data"
```

使用这些语法前，建议直接查当前 parser，因为 Arrays 方言仍可能扩展。

---

# 31. Planète Maths

当前 parser 可见的扩展 reporter/condition 包括：

```text
factorial of x
sum of digits of x

min of a and b
max of a and b

a to the power of b

pi
euler
```

条件：

```text
a is multiple of b
```

除非用户明确使用该扩展，否则不要用这些替代 Scratch 原生基础运算。

---

# 32. RAW

BrickWright 还存在用于 round-trip 保留无法映射代码的 RAW 机制。

概念示例：

```text
raw "some source code"
```

用途：

- 其他语言 reader 无法还原成 Scratch 积木时保留信息；
- 避免静默丢失代码。

普通 Scratch 项目不要主动使用 RAW。

如果遇到已有 RAW：

1. 不要擅自删除；
2. 先解释它原本保留了什么；
3. 能安全改写为标准积木时再替换。

---

# 33. 设备 / 硬件方言

当前 `sb3Creator.js` 已经远超纯 Scratch compiler。

顶层解析中存在诸如：

```text
DEVICE
CLOCK
PIN
PORT
PART
TABLE
LEDCUBE
MAP
CHIP
```

等声明。

例如源码明确解析：

```text
DEVICE <name>
CLOCK <number> hz
CLOCK <number> mhz
```

并支持不同设备别名与硬件 target。

## 33.1 使用硬件方言时的强制规则

如果用户任务涉及：

- Arduino
- STC12 / 8051
- micro:bit
- SPIKE Prime
- RP2040 / Pico
- STM32
- 6502
- LED Cube
- 电路/芯片/引脚
- 设备 C
- MicroPython

则：

> **不要仅依赖本 Skill 中的例子。必须打开当前版本 `sb3Creator.js` / runtime registry / tests 检查对应设备语法。**

硬件方言增长速度快，本 Skill 只提供入口，不保证穷举所有设备块。

---

# 34. 名称与引用规则

生成项目时必须保持名称完全一致。

例如：

```text
SPRITE Bullet:
```

引用时：

```text
create clone of Bullet
point towards Bullet
```

不要变成：

```text
bullet
子弹
Bullet1
```

除非用户明确要求重命名。

广播名称同理：

```text
broadcast "开始购买"
```

必须和：

```text
WHEN I receive "开始购买":
```

完全一致。

---

# 35. Scratch 项目设计原则

使用 sb3-creator 不代表可以忽略 Scratch 自身限制。

编写逻辑时仍要考虑：

- Scratch 调度机制
- 克隆体最大数量
- 广播的并发行为
- “广播并等待”与普通广播区别
- 自制积木 warp 对刷新与 yield 的影响
- 全局变量与角色私有变量
- 全局列表与角色私有列表
- 克隆体共享角色局部变量的 Scratch 行为
- 每个角色脚本之间可能并行执行
- `wait` 会让出执行权
- FAST 自制积木的行为和普通脚本不同

不要把 Scratch 当成同步 Python 程序。

---

# 36. 修改已有 `.sb3` 时的规则

如果用户提供已有 `.sb3`：

1. 必须先读取项目结构。
2. 不要凭想象重建整个项目。
3. 保留现有：
   - 角色
   - 造型
   - 声音
   - 变量
   - 列表
   - 广播
   - 自制积木
   - 注释
   - 扩展
4. 只修改用户要求的部分。
5. 修改后实际重新打开/编译/验证。
6. 不得因为 sb3-creator 不认识某扩展就直接静默删除。
7. 对非原生扩展要先判断是否应：
   - 保留；
   - 用 RAW/占位；
   - 转换；
   - 或明确告知限制。

---

# 37. 输出伪代码时的格式要求

用户只要求“直接给 Scratch 伪代码”时：

- 不要先长篇解释；
- 先给可复制代码；
- 必要说明放在代码后；
- 不要混入 Python/C 语法；
- 不要自创块名。

推荐：

```text
# 初始化
WHEN flag clicked:
  set score to 0

# 每帧更新
WHEN I receive "开始":
  FOREVER:
    ...
```

---

# 38. 用户要求“不新增变量/列表/自制积木”时

这是强约束。

若用户明确：

- 不新增变量
- 不新增列表
- 不新增自制积木
- 只能使用现有角色
- 只能使用指定积木

必须严格遵守。

不能为了代码漂亮私自增加：

```text
LOCAL temp
GLOBAL flag
LIST cache
DEFINE helper:
```

应尝试：

- 直接使用现有 Reporter；
- 复用现有变量；
- 使用表达式内联；
- 使用列表现有项；
- 用广播和现有状态表达。

如果数学上/逻辑上确实无法满足，应明确指出为什么，而不是偷偷添加。

---

# 39. 用户提供“可用积木清单”时

用户给出的积木清单优先级高于本 Skill。

例如用户说：

> 只能使用 `> < = 与 或 不成立`，不能使用 `>= <= !=`

那么即使 sb3-creator parser 支持 `>=`、`<=`，也不得使用。

需要改写：

```text
a >= b
```

为：

```text
not a < b
```

需要改写：

```text
a != b
```

为：

```text
not a = b
```

---

# 40. Scratch 原生积木与 sb3-creator 扩展要区分

回答时如果用户问“Scratch 能不能这样写”，应区分：

1. Scratch GUI 原生是否有该积木；
2. sb3-creator 是否支持这种文本简写；
3. parser 是否将其转换为多个原生积木；
4. 是否需要扩展。

例如：

```text
a <= b
```

sb3-creator 可以支持，但 Scratch GUI 没有单独 `<=` 运算积木。

因此解释应是：

> BrickWright 语法支持 `<=`，编译时转换为 Scratch 可表达的等价逻辑。

不要说：

> Scratch 原生有 `<=` 积木。

---

# 41. 常见错误与修正

## 错误 1：IF 少 THEN

错误：

```text
IF hp > 0:
```

正确：

```text
IF hp > 0 THEN:
```

---

## 错误 2：REPEAT UNTIL 少冒号

错误：

```text
REPEAT UNTIL hp = 0
```

正确：

```text
REPEAT UNTIL hp = 0:
```

---

## 错误 3：Python 赋值

错误：

```text
score = 0
```

正确：

```text
set score to 0
```

变量初始化声明除外：

```text
GLOBAL score = 0
```

---

## 错误 4：Python 增量

错误：

```text
score += 1
```

正确：

```text
change score by 1
```

---

## 错误 5：位运算写成前缀

错误：

```text
bitand value 255
```

正确：

```text
value bitand 255
```

---

## 错误 6：把 LIST 与 array 混用

错误思路：

```text
LIST nums
set item 0 of array "nums" to 5
```

这两个属于不同数据系统。

普通 Scratch 列表应：

```text
replace item 1 of nums with 5
```

---

## 错误 7：角色名拼错

声明：

```text
SPRITE Player:
```

错误：

```text
point towards player1
```

应：

```text
point towards Player
```

---

## 错误 8：布尔表达式强塞进普通值槽

不推荐：

```text
set selected to x > 0
```

稳妥改为：

```text
IF x > 0 THEN:
  set selected to 1
ELSE:
  set selected to 0
```

---

# 42. 生成前检查清单

输出完整代码前检查：

- [ ] `STAGE:` / `SPRITE ...:` 是否正确
- [ ] 变量是否提前声明或能被 parser 正确创建
- [ ] 全局/局部作用域是否正确
- [ ] 列表作用域是否正确
- [ ] 所有广播名称是否一致
- [ ] 所有角色引用名称是否一致
- [ ] `WHEN` 帽子积木格式是否正确
- [ ] `IF ... THEN:` 是否有 THEN
- [ ] `ELSE:` 缩进是否正确
- [ ] `REPEAT` / `FOREVER` 是否带冒号
- [ ] `REPEAT UNTIL` 是否带冒号
- [ ] 自制积木参数类型是否正确
- [ ] FAST 是否真的需要
- [ ] 有没有把 Python 语法混进来
- [ ] 有没有偷偷新增用户禁止的变量/列表/自制积木
- [ ] 有没有使用用户未允许的扩展
- [ ] 是否保留已有项目资源
- [ ] 能运行仓库时是否执行 `--check`

---

# 43. 修改完成后的验证清单

如果实际生成 `.sb3`：

1. `.sb3` 必须能正常解压。
2. `project.json` 必须存在。
3. 角色、舞台、造型、声音资源存在。
4. 所有 block input 引用有效。
5. 所有 parent/next 引用有效。
6. 广播 ID 有效。
7. 自制积木 prototype / definition / call 能对应。
8. 扩展列表包含实际使用的扩展。
9. Scratch/TurboWarp 能打开项目。
10. 用户要求的脚本实际存在于正确角色。
11. 如果项目有复杂交互，应实际运行测试。
12. 不只检查“文件生成成功”。

---

# 44. 推荐的完整普通 Scratch 模板

```text
GLOBAL score = 0
GLOBAL gameState = 0
GLOBAL LIST history = []

STAGE:
BACKDROP game

WHEN flag clicked:
  set score to 0
  set gameState to 0
  delete all of history
  broadcast "初始化" and wait
  broadcast "开始"

SPRITE Player:

LOCAL hp = 100
LOCAL vx = 0
LOCAL vy = 0

COSTUME normal
COSTUME hurt

WHEN I receive "初始化":
  set hp to 100
  set vx to 0
  set vy to 0
  go to x: 0 y: 0
  switch costume to normal
  show

WHEN I receive "开始":
  FOREVER:
    IF key right arrow pressed? THEN:
      change x by 5

    IF key left arrow pressed? THEN:
      change x by -5

    IF touching edge THEN:
      say "edge" for 0.2 seconds

    wait 0.016 seconds

WHEN I receive "damage":
  change hp by -10

  IF hp <= 0 THEN:
    broadcast "dead"
    hide

DEFINE FAST move player (dx) (dy):
  change x by dx
  change y by dy
```

这个模板只是结构示范。不要机械复制不需要的变量或自制积木。

---

# 45. 从自然语言转换为 sb3-creator 的方法

用户描述：

> 点击绿旗后，把分数设为 0。按空格时增加 1 分。分数大于 10 时说“赢了”。

转换：

```text
GLOBAL score = 0

STAGE:

WHEN flag clicked:
  set score to 0

WHEN space key pressed:
  change score by 1
  IF score > 10 THEN:
    say "赢了"
```

---

# 46. 从 Scratch 中文积木转换的常用对照

| Scratch 中文积木 | BrickWright |
|---|---|
| 当绿旗被点击 | `WHEN flag clicked:` |
| 当按下空格键 | `WHEN space key pressed:` |
| 当角色被点击 | `WHEN sprite clicked:` |
| 当接收到 [消息] | `WHEN I receive "消息":` |
| 广播 [消息] | `broadcast "消息"` |
| 广播 [消息] 并等待 | `broadcast "消息" and wait` |
| 重复执行 | `FOREVER:` |
| 重复执行 10 次 | `REPEAT 10:` |
| 重复执行直到 | `REPEAT UNTIL cond:` |
| 如果...那么 | `IF cond THEN:` |
| 否则 | `ELSE:` |
| 等待 1 秒 | `wait 1 seconds` |
| 等待直到 | `wait until cond` |
| 移动 10 步 | `move 10 steps` |
| 将 x 坐标增加 10 | `change x by 10` |
| 将 x 坐标设为 0 | `set x to 0` |
| 移到 x: y: | `go to x: 0 y: 0` |
| 面向鼠标指针 | `point towards mouse-pointer` |
| 说 Hello | `say "Hello"` |
| 显示 | `show` |
| 隐藏 | `hide` |
| 将变量设为 | `set var to value` |
| 将变量增加 | `change var by value` |
| 添加到列表 | `add value to list` |
| 删除列表全部项目 | `delete all of list` |
| 替换列表项 | `replace item n of list with value` |
| 询问并等待 | `ask "..." and wait` |
| 创建自己的克隆体 | `create clone of myself` |
| 删除此克隆体 | `delete this clone` |
| 定义自制积木 | `DEFINE name (...):` |
| 定义不刷新屏幕自制积木 | `DEFINE FAST name (...):` |

---

# 47. 面对不确定语法时的处理方式

如果某条语法不在本 Skill 或不确定当前版本是否支持：

不要猜。

按以下方式查：

1. 搜索 `src/utils/sb3Creator.js` 中对应 Scratch opcode。
2. 搜索该语法关键字的 `line.match(...)`。
3. 搜索 `test/`。
4. 搜索 `examples/`。
5. 用最小测试文件执行：

```bash
node bin/sb3c.mjs --check test.txt
```

最小测试例：

```text
STAGE:

SPRITE Test:

WHEN flag clicked:
  <待验证语法>
```

如果 parser 能过、生成的 opcode 也正确，才能把该写法当作支持语法。

---

# 48. 更新本 Skill 的规则

sb3-creator 仍在快速更新。

更新时：

1. 打开最新：
   - `README.md`
   - `src/components/SyntaxGuide.jsx`
   - `src/utils/sb3Creator.js`
2. 对比新增 parser 分支。
3. 对比 `examples/` 数量与新例子。
4. 对比 `test/` 新增功能。
5. 把新增语法分到：
   - Scratch 核心
   - 通用扩展
   - Arrays/Math
   - 设备/硬件
6. 不因为 README 未写就删除 parser 中实际支持的语法。
7. 不因为 parser 有内部 opcode 就假设一定存在公开文本语法。

---

# 49. 当前参考版本信息

本 Skill 根据 **2026-09-06** 获取的 `main` 分支整理。

当时仓库 README 显示：

- 项目是 BrickWright 双向/多表示编译器；
- `sb3Creator.js` 是语言 compiler 核心；
- gallery 约 74 个 examples；
- tests 约 1500；
- README 中统计 `sb3Creator.js` 约 7,400 行；
- 但当天直接读取的最新 `src/utils/sb3Creator.js` 已约 14,897 行，说明 main 分支持续快速演进。

因此版本漂移风险较高，未来使用时务必遵守：

> **源码 parser > 本 Skill**

---

# 50. 关键源码位置

仓库：

```text
https://github.com/CrispStrobe/sb3-creator
```

Quick Syntax Reference：

```text
https://github.com/CrispStrobe/sb3-creator/blob/main/src/components/SyntaxGuide.jsx
```

Parser / Compiler：

```text
https://github.com/CrispStrobe/sb3-creator/blob/main/src/utils/sb3Creator.js
```

Examples：

```text
https://github.com/CrispStrobe/sb3-creator/tree/main/examples
```

命令行编译：

```text
node bin/sb3c.mjs input.txt output.sb3
```

仅检查：

```text
node bin/sb3c.mjs --check input.txt
```

---

# 51. 最终执行准则

每次使用本 Skill 时牢记：

1. **先遵守用户约束，再遵守本 Skill 的推荐。**
2. **以当前 parser 为最终语法真相。**
3. **普通 Scratch 任务优先使用标准、简单、可读的语法。**
4. **不要混入 Python/C/JavaScript 风格语法。**
5. **不要发明积木或伪代码关键词。**
6. **不要偷偷新增用户禁止的变量、列表、自制积木。**
7. **不要把 sb3-creator 的语法糖误说成 Scratch 原生积木。**
8. **硬件/扩展任务必须查当前源码。**
9. **修改 `.sb3` 后要真实验证，不只生成文件。**
10. **可以运行仓库时，用 `--check` 验证最终伪代码。**
