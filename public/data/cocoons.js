/* Stage 3 local demo configuration. Replace labels and dataUrl values when final content arrives. */
window.PojianCocoons = {
  version: 1,
  rooms: [
    {
      id: 'north', name: '北侧树洞', themeId: 'nature', themeTitle: '自然观察',
      accent: '#87ad7e', sound: '风、鸟与轻叶声', entrance: 'open',
      personTags: [], contentTags: [], dataUrl: 'demo-data.html?room=north',
      demoLine: '沿着一片叶脉，发现习惯之外的观察方式。'
    },
    {
      id: 'stream', name: '溪畔倒木', themeId: 'journey', themeTitle: '远行见闻',
      accent: '#d2a074', sound: '风铃与远行的节拍', entrance: 'open',
      personTags: [], contentTags: [], dataUrl: 'demo-data.html?room=stream',
      demoLine: '同一条路，在不同旅人的眼中通向不同地方。'
    },
    {
      id: 'hill', name: '苔坡树桩', themeId: 'music', themeTitle: '音乐收藏',
      accent: '#9b9dcc', sound: '柔和的旋律片段', entrance: 'open',
      personTags: [], contentTags: [], dataUrl: 'demo-data.html?room=hill',
      demoLine: '节奏会改变我们注意到的风景。'
    }
  ]
};
