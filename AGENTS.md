# 项目约定

- 中文版与英文版均开放：首页可切换 EN / 中文，使用相同布局与功能，共用微信账号下的记录和本机草稿；中文使用本地中文字体与中文文案。

- PAOXIA（跑下）是轻松记录跑步与沿途感受的微信原生小程序，使用 WXML、WXSS 和 JavaScript。
- 当前交付为微信原生小程序，已完成跑步记录使用本机 Storage 缓存并经 CloudBase 按微信身份同步，支持多条记录；未完成跑步也保存在本机，可恢复时长和暂停状态，点击 Done 后计时信息转入跑后草稿，支持继续同一次跑步，填写期间不计时；跑步时申请前后台定位并累计 GPS 距离（需微信后台开通接口和用户授权），暂停及 Done 后停止定位，跑后距离自动回填且可手动修改；缓存累计米数及相对位移，完成记录同步归一化路线轮廓，不保存或上传经纬度轨迹，定位中断或进程重启提示核对距离；保存或放弃后清除。云环境为 `cloud1-d0gdhw9khd6812077`（国内站上海），通过 `paoxiaSync` 云函数验证 OPENID/APPID，`paoxia_runs` 集合为 ADMINONLY。离线变更持久排队，联网和页面打开时重试；冲突编辑保留为副本。跑后表单仅保留一份本机草稿，可从首页继续填写，保存成功或主动放弃后清除。
- `plan.md` 是开发前建议方案，其中的 TypeScript 与旧云端架构不是已落实的技术约定；当前同步实现以 `docs/cloud-sync.md` 和代码为准。
- 在微信开发者工具中导入仓库根目录，保留 `project.config.json` 中已有的 AppID。
- 界面修改遵循已有的 `DESIGN.md`；具体视觉规则不在此重复。
- 本地行为检查在仓库根目录运行：`node scripts/check-ui.cjs`、`node scripts/check-sync.cjs`、`node scripts/check-location.cjs` 与 `node scripts/check-route.cjs`。
- `python3 scripts/preview-ui.py` 仅生成浏览器近似布局预览，不能替代微信运行环境验证。
- 完成任务时，仅在改动使本文事实或约定失效时更新本文，并删除过时规则。
