/* Local-only demonstration profile and shared felt icon manifest. */
window.PojianUIConfig = {
  version: 1,
  iconRoot: '../public/assets/icons/',
  icons: {
    map: 'map/map.png', clear: 'weather/weather-clear.png', cloudy: 'weather/weather-cloudy.png',
    rain: 'weather/weather-rain.png', fog: 'weather/weather-fog.png', wind: 'weather/weather-wind.png',
    data: 'data/data.png', profile: 'data/profile.png', history: 'data/history.png', friends: 'data/friends.png',
    quests: 'quest/quests.png', findPeople: 'quest/find-people.png', complete: 'quest/quest-complete.png',
    badge: 'quest/rookie-badge.png', messages: 'message/messages.png'
  },
  profile: {name: '阿吉', tags: ['蘑菇料理', '夜行', '苔藓气味']},
  weather: [
    {id: 'clear', label: '晴'}, {id: 'cloudy', label: '多云'}, {id: 'rain', label: '雨'},
    {id: 'fog', label: '雾'}, {id: 'wind', label: '风'}
  ],
  sunny: {background: '#b8c4b7', fogNear: 22, fogFar: 46, hemisphere: 1.9, sun: 2.8, exposure: 1.32}
};
