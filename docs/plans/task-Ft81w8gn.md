# task-Ft81w8gn 计划

## 需求

在 Mine/我的相关页面中去掉“查看/检查更新”功能。

## 现状

项目没有 `MineScreen.js`，对应入口为 `MeScreen.js` 的“关于我们”菜单，更新检查按钮实际在 `src/screens/AboutScreen.js` 中渲染，并调用 `src/services/updateService.js`。

## 实施

1. 从 AboutScreen 移除更新检查相关 import、state、handleCheckUpdate 逻辑。
2. 移除“检查新版本”按钮和不再使用的样式。
3. 保留版本信息和关于应用内容，不影响“我的”页其他菜单。
4. 运行基础校验，确认无语法错误和无未提交变更。
