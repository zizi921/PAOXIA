# PAOXIA 跑下
<!-- impeccable:product-schema 1 -->

## Platform
adaptive

实际交付平台为微信原生小程序（WXML/WXSS/JavaScript），同时适配 iOS 和 Android 的微信运行环境。

## Stack
用户明确要求原生 WXML/WXSS；当前无已有工程，因此创建最小原生工程。

## Product Purpose
轻松记录跑步，保留沿途见闻和感受。完整产品规划见 plan.md。

## Capabilities and Constraints
当前原型包含首页、跑步页、跑后记录页和跑步记录页。点击 GO 后开始真实计时，并通过微信持续定位在本机自动累计跑步距离；支持暂停、继续和锁屏后台记录，并将最终时长与距离带到跑后记录页。跑后记录可选择天气、心情和见闻；首页可直接进入第四页，以本机 Storage 中已完成的多条记录展示 Year / Month / Day 视图和真实统计，无记录时显示空状态。同一天的多次记录可从 Month 分别进入详情，关闭重开后仍保留。不接数据库或业务网络，未完成跑步和表单草稿均保存在本机。

## Brand Commitments
用户提供的概念图为三个页面的视觉依据：手绘小人、蓝裤子、黄鞋底、大留白、浅绿色主要按钮和轻松的手绘记录表。保留图中英文文字。

## Evidence on Hand
output/approved-concept.png、用户提供的第三页参考图及 plan.md。项目已有三页原生小程序前端和共享样式。
