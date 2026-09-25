# 前端原型交付

范围：首页、跑步页、跑后记录页与跑步记录页；GO 后开始前端计时，暂停时间不计入跑步时长，第四页提供 Year / Month / Day 三种演示视图。

## 本轮修改
- miniprogram/app.wxss：共享按钮宽度优先级、最小触控高度、动态顶部安全间距。
- miniprogram/pages/home/home.{js,wxml,wxss}：注入胶囊安全间距，短屏留白，确保 GO 浅绿底生效。
- miniprogram/pages/run/run.{js,wxml,wxss}：注入胶囊安全间距，调整短屏插画空间，明确返回链接定位。
- miniprogram/pages/recap/recap.{js,json,wxml,wxss}：跑后记录页包含四个心情、六个见闻选项、距离及备注输入，并可保存返回首页。
- miniprogram/pages/history/history.{js,json,wxml,wxss}：新增第四页跑步记录 UI、Year / Month / Day 切换、周期切换、记录下钻与 Go again 返回首页。
- miniprogram/app.json：注册第三页路由。
- miniprogram/utils/layout.js：读取微信胶囊底边并预留 20px；不可用时回退 96px。
- scripts/check-ui.cjs：补充安全间距及页面初始化检查。
- scripts/preview-ui.py、output/ui-preview/{home,run}.html：同步近似预览。
- README.md：修正现有 AppID 配置说明。

## 已完成验证
- 本地检查：路由完整性、GO 防重复点击、真实计时、暂停时长排除、时长传递、跑后选择及输入状态、Save 返回首页、无数据请求及持久化，通过。
- 用户要求暂停机型验证前，320px 原生模拟器完成 GO → Pause → Resume → Done 流程，主按钮 243×61px。
- 已发起的 375px 检查返回：主按钮 285×72px，返回按钮高 52px；页面边界为 375×667px；暂停／继续和返回通过。跑步页截图命令超时，未重试。
- 按最新指示，完整机型验证及最终样式复验暂缓；已有截图不是最终全部样式的验收凭据。

## 相对概念图的主动调整
- 微信提供系统状态栏与胶囊，页面不绘制手机外框或伪造系统控件。
- 保留现有手绘人物素材、蓝黄配色、英文信息层级与大留白。
- 使用可编辑字体和 WXSS 实线不对称圆角、浅绿填充，替代图中不可编辑的笔触文字与按钮纹理。
- 按安全区和短屏高度压缩留白，保持操作可触达。
- 补充 Take a breath. / Resume 暂停态；计时以 GO 点击时间为起点，并用绝对时间差避免页面渲染延迟造成明显漂移。
- 跑步页提供 Pause／Resume 和 Done 两个独立操作；Done 在跑动中与暂停时均可结束，两个操作文字字号一致。
- 第三页的小图标均由 WXML/WXSS 绘制，保持可编辑；默认选择 Calm 与 Cat，感受与见闻重复点击均可清空。
