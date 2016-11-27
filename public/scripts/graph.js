$(function () {
  var voteOptions = votes.map(function(c) { return c.vote; });
  var votesUsingHighcharts = votes.map(function(c) {
    return {
      name: c.vote,
      data: [c.count]
    };
  });

  Highcharts.chart('chart-container', {
    chart: {
      type: 'column'
    },
    title: {
      text: 'Votes'
    },
    xAxis: {
      categories: voteOptions
    },
    yAxis: {
      min: 0,
    },
    series: votesUsingHighcharts
  });
});
