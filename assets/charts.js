(function () {
  var style = getComputedStyle(document.documentElement);
  var accent = style.getPropertyValue('--accent').trim();
  var accent2 = style.getPropertyValue('--accent2').trim();
  var ink = style.getPropertyValue('--ink').trim();
  var muted = style.getPropertyValue('--muted').trim();
  var rule = style.getPropertyValue('--rule').trim();
  var bg2 = style.getPropertyValue('--bg2').trim();

  // --- Chart: match breakdown ---
  var matchEl = document.getElementById('chart-match');
  if (matchEl && window.echarts) {
    var cm = echarts.init(matchEl, null, { renderer: 'svg' });
    cm.setOption({
      animation: false,
      grid: { left: 8, right: 24, top: 34, bottom: 6, containLabel: true },
      legend: {
        top: 0, left: 0, itemWidth: 10, itemHeight: 10, itemGap: 16,
        textStyle: { color: muted, fontSize: 11 }
      },
      tooltip: {
        trigger: 'axis', axisPointer: { type: 'shadow' }, appendToBody: true,
        backgroundColor: bg2, borderColor: rule, textStyle: { color: ink, fontSize: 12 }
      },
      xAxis: {
        type: 'value', max: 70,
        axisLabel: { color: muted, fontSize: 10, formatter: '{value}' },
        splitLine: { lineStyle: { color: rule, type: 'dashed' } },
        axisLine: { show: false }, axisTick: { show: false }
      },
      yAxis: {
        type: 'category', inverse: true,
        data: ['技能覆盖（满分 70）', '经验匹配（满分 15）', '量化表达（满分 15）'],
        axisLabel: { color: ink, fontSize: 12 },
        axisLine: { lineStyle: { color: rule } }, axisTick: { show: false }
      },
      series: [
        {
          name: '已得分', type: 'bar', stack: 'total', barWidth: 22,
          itemStyle: { color: accent, borderRadius: [0, 0, 0, 0] },
          label: {
            show: true, position: 'inside', color: '#fff', fontSize: 11, fontWeight: 700,
            formatter: function (p) { return p.value; }
          },
          data: [58.8, 15, 15]
        },
        {
          name: '未得分', type: 'bar', stack: 'total', barWidth: 22,
          itemStyle: { color: 'rgba(52,80,140,0.12)' },
          data: [11.2, 0, 0]
        }
      ]
    });
    window.addEventListener('resize', function () { cm.resize(); });
  }

  // --- Chart: interview radar ---
  var radarEl = document.getElementById('chart-radar');
  if (radarEl && window.echarts) {
    var cr = echarts.init(radarEl, null, { renderer: 'svg' });
    cr.setOption({
      animation: false,
      tooltip: {
        trigger: 'item', appendToBody: true,
        backgroundColor: bg2, borderColor: rule, textStyle: { color: ink, fontSize: 12 }
      },
      radar: {
        center: ['50%', '54%'], radius: '66%',
        indicator: [
          { name: '内容相关', max: 25 },
          { name: '结构完整', max: 25 },
          { name: '证据量化', max: 25 },
          { name: '表达清晰', max: 25 }
        ],
        axisName: { color: ink, fontSize: 12 },
        splitLine: { lineStyle: { color: rule } },
        splitArea: { areaStyle: { color: ['rgba(52,80,140,0.015)', 'rgba(52,80,140,0.045)'] } },
        axisLine: { lineStyle: { color: rule } }
      },
      series: [{
        name: '答辩得分',
        type: 'radar',
        symbolSize: 6,
        lineStyle: { color: accent, width: 2 },
        itemStyle: { color: accent },
        areaStyle: { color: 'rgba(52,80,140,0.16)' },
        label: { show: true, color: accent, fontSize: 11, fontWeight: 700 },
        data: [{ value: [10, 18, 16, 22], name: '本次答辩 61 / 100' }]
      }]
    });
    window.addEventListener('resize', function () { cr.resize(); });
  }

  // --- Diagram: workflow ---
  if (window.mermaid) {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'base',
      securityLevel: 'loose',
      fontFamily: "'Instrument Sans','PingFang SC','Microsoft YaHei',sans-serif",
      themeVariables: {
        primaryColor: '#eef2fa',
        primaryBorderColor: accent,
        primaryTextColor: ink,
        lineColor: '#93a3c4',
        secondaryColor: '#fbf3ea',
        tertiaryColor: '#ffffff',
        fontSize: '13px'
      },
      flowchart: { curve: 'basis', nodeSpacing: 38, rankSpacing: 44, htmlLabels: true }
    });
    mermaid.run({ querySelector: '.mermaid' }).catch(function () {
      /* keep the source text visible if a diagram fails to parse */
    });
  }
})();
