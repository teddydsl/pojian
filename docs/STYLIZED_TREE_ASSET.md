# 挂茧房树模型资产

- 原始文件：`/Users/ted/Downloads/stylized tree 3d model.glb`
- 原始体积：约 56 MB；约 107 万顶点、194 万三角面。
- 游戏候选文件：`public/assets/models/stylized-tree-game.glb`
- 当前候选体积：约 951 KB；约 2.1 万顶点、3.2 万三角面；三张 768×768 JPEG 贴图。
- 预览：`reviews/stylized-tree-game-preview.png`

这版保留原模型的树干、树冠、UV 和基础色/法线/粗糙度材质，目标是后续替换挂茧房场景里的树。当前阶段暂不自动接入现有场景，避免影响已验收的茧房交互。

重新生成：

```bash
python3 scripts/optimize-stylized-tree.py \\
  "/Users/ted/Downloads/stylized tree 3d model.glb" \\
  public/assets/models/stylized-tree-game.glb \\
  160000 768
```
