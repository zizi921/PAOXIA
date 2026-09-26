---
name: PAOXIA 跑下
description: 松弛、粗拙的手绘跑步记录界面
colors:
  paper: "#fdfcf9"
  charcoal: "#262622"
  charcoal-border: "#30312a"
  leaf-wash: "#e5ecdf"
  underline-green: "#75927b"
  trouser-blue: "#3d91d0"
  sole-yellow: "#f5ad22"
typography:
  display:
    fontFamily: "PaoxiaHand, cursive"
    fontWeight: 600
    lineHeight: 1.05
  homeDisplay:
    fontFamily: "Kalam, cursive"
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
    backgroundColor: "{colors.leaf-wash}"
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

## Colors

**纸面规则。** 大面积背景只使用温暖纸白；浅绿只用于主要行动或短下划线。蓝色与黄色保留给人物，让角色始终是画面的视觉核心。

## Typography

首页使用 Kalam Bold，强化第一眼的轻松手写感。跑步页、跑后记录页和 Days Out. 页面继续使用 Caveat 的本地嵌入版本，保持既有视觉与数据排版。两套字体都随包嵌入，不依赖运行时网络。

## Layout

**呼吸规则。** 页面只保留一个主要任务，人物与操作区之间保留明显留白。首页让大人物压低画面重心；跑步页依次呈现状态、时间、缩小人物和操作。

320px 与 375px 宽度下，主要按钮保持接近屏宽的 76%，触控高度不低于 44px，页面不得横向滚动。

## Elevation & Depth

不使用阴影、玻璃或悬浮卡片。层级由留白、字号和插画比例形成。

## Shapes

按钮使用略微不对称的长圆轮廓，模拟手绘形变。链接下划线轻微倾斜，不使用规整组件库线条。

## Components

主要按钮使用浅绿纸色；次要按钮透明。按下态通过轻微缩放和透明度变化反馈。系统状态栏和微信胶囊由运行时提供，不在页面内仿造。

## Do's and Don'ts

- 保留真实手绘插画，不以代码图形模拟人物。
- 文字、按钮、背景和布局必须由 WXML/WXSS 构成，保持可编辑。
- 不加入数据卡片、配速指标、渐变、阴影或竞技化文案。
