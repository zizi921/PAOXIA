---
name: PAOXIA 跑下
description: 松弛、粗拙的手绘跑步记录界面
colors:
  paper: "#fdfcf9"
  charcoal: "#262622"
  charcoal-border: "#30312a"
  runner-wash: "#dfeaf4"
  runner-wash-soft: "#edf4fa"
  runner-blue-muted: "#8bb8d8"
  runner-blue-ink: "#7f9fb8"
  label-blue: "#58758c"
  underline-green: "#75927b"
  trouser-blue: "#3d91d0"
  sole-yellow: "#f5ad22"
typography:
  display:
    fontFamily: "Inter, sans-serif"
    fontWeight: 600
    lineHeight: 1.05
  homeDisplay:
    fontFamily: "Inter, sans-serif"
    fontWeight: 700
    lineHeight: 1.05
rounded:
  action-top-left: "76rpx"
  action-top-right: "72rpx"
  action-bottom-right: "78rpx"
  action-bottom-left: "70rpx"
  action: "76rpx 72rpx 78rpx 70rpx"
spacing:
  screen-edge: "44rpx"
  action-height: "144rpx"
components:
  action-primary:
    backgroundColor: "{colors.runner-wash}"
    textColor: "{colors.charcoal}"
    typography: "{typography.display}"
    rounded: "{rounded.action}"
    height: "{spacing.action-height}"
  action-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.charcoal}"
    typography: "{typography.display}"
    rounded: "{rounded.action}"
    height: "{spacing.action-height}"
---

## Overview

PAOXIA 使用纸张、炭笔和蜡笔的视觉语言，把跑步呈现为轻松出门，而非成绩面板。人物插画承担情绪和品牌识别，界面结构保持克制。

首页主插画采用 Logo 圆头笑脸角色的系鞋带版本：黑色圆角粗线条、透明背景，保持原有首页布局。

## Colors

**纸面规则。** 大面积背景只使用温暖纸白；从人物蓝裤子提取的浅蓝只用于主要行动、选中状态和记录底纹。黄色保留给鞋底点缀，让角色始终是画面的视觉核心。

## Typography

英文界面统一使用本地嵌入的 Inter；页面标题、导航、汇总和主要按钮可以加粗，记录列表中的日期、星期、时长、距离和心情使用 600 字重。字体随包嵌入，不依赖运行时网络。

历史页英文 Year / Month / Day 标签例外使用系统圆体 Arial Rounded MT Bold，依次回退到 ui-rounded、Inter 和 sans-serif；保留原有字号、颜色与选中底纹，不下载远程字体。

中文界面的标题、问题、按钮和说明文字优先使用苹果苹方常规字重（400）；在不提供苹方的设备上依次回退到冬青黑体、微软雅黑和系统无衬线字体。计时、日期、距离等数据沿用原有系统数字字体和 500 字重，避免切换语言后数字尺寸和节奏发生变化。

中文“跑跑记记”页面统一使用苹方 400 字重；字号、颜色和间距继续承担信息层级，避免同一页面出现粗细跳变。

中文首页的主按钮和记录入口使用常规字重的苹方，以保持入口清爽、清楚。

## Layout

页面切换时保持整体框架稳定；第三页 So? 与第四页 Days Out. 使用相同的标题位置、字体与字号。调整结果文字等局部内容时，不应带动标题或周围布局移动。

**呼吸规则。** 页面只保留一个主要任务，人物与操作区之间保留明显留白。首页让大人物压低画面重心；跑步页依次呈现状态、时间、缩小人物和操作。

320px 与 375px 宽度下，主要按钮保持接近屏宽的 76%，触控高度不低于 44px，页面不得横向滚动。

## Elevation & Depth

不使用阴影、玻璃或悬浮卡片。层级由留白、字号和插画比例形成。

## Shapes

按钮使用略微不对称的长圆轮廓，模拟手绘形变。链接下划线轻微倾斜，不使用规整组件库线条。

## Components

主要按钮使用人物蓝裤子的浅蓝纸色；次要按钮透明。按下态通过轻微缩放和透明度变化反馈。系统状态栏和微信胶囊由运行时提供，不在页面内仿造。

## Motion

第二页采用 Logo 圆头笑脸、黑色粗线条的跑步人物。跑步计时进行时，人物以短促、低幅度的上下步频持续运动，表达正在跑步的状态；暂停后人物立即静止，继续后恢复。动画只使用 transform，避免改变页面布局或增加低端设备负担。

Days Out. 详情页从十个 Logo 圆头笑脸、黑色粗线条角色姿势中选择一个，选择由记录 ID 稳定决定，因此同一条记录再次打开时保持原姿势。Year 汇总使用跑步姿势，Month 汇总与空状态使用坐着休息的姿势。

## Do's and Don'ts

- 保留真实手绘插画，不以代码图形模拟人物。
- 文字、按钮、背景和布局必须由 WXML/WXSS 构成，保持可编辑。
- 不加入数据卡片、配速指标、渐变、阴影或竞技化文案。

跑后表单 Notice 八个选项使用统一的黑色圆角粗线条图标，保留四列两行排列、原有文字样式和选中圈。

跑后表单四个心情表情使用黑色粗线条圆脸，保留原有布局、标签和 Not sure 的问号。

跑后表单天气使用圆角粗线条图标：晴天暖黄、多云灰蓝、雨天蓝、有风灰绿，菜单与选中预览保持一致。

首页全新跑步入口为 READY，点击全屏依次显示 3、2、1（每个一秒）和大号 GO（0.6 秒），随后进入计时页；准备阶段不计入跑步时长，切到后台即取消准备。已有跑步或草稿仍直接继续。

首页 READY（含继续跑步/草稿状态）按钮使用纸白底、黑字和黑色边框，保持原有尺寸与位置。

跑后表单 Save / Save changes 按钮与首页 READY 一致，使用纸白底、黑字和黑色边框。

记录页 One More Time 按钮同样使用纸白底、黑字和黑色边框。

记录页 FELT 和 SEEN（含月度列表）复用跑后表单的新版黑色粗线条心情与沿途图标；未填写的记录仍显示原有空状态文字。
