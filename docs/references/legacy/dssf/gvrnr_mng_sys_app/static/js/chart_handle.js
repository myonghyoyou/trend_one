/*
const ctx = document.getElementById('myChart');

const config = {
    type: 'line',
    data: {
        labels: ['2022-03-10 13:14', '2022-03-10 13:17', '2022-03-10 13:20', '2022-03-10 13:23', '2022-03-10 13:26', '2022-03-10 13:29', '2022-03-10 13:32', 
                '2022-03-10 13:35', '2022-03-10 13:38', '2022-03-10 13:41', '2022-03-10 13:44', '2022-03-10 13:47', '2022-03-10 13:50', '2022-03-10 13:53', '2022-03-10 13:56', 
                '2022-03-10 13:59', '2022-03-10 14:02', '2022-03-10 14:05', '2022-03-10 14:08', '2022-03-10 14:11', '2022-03-10 14:14', '2022-03-10 14:17', '2022-03-10 14:20', 
            '2022-03-10 14:23', '2022-03-10 14:26', '2022-03-10 14:29', '2022-03-10 14:32', '2022-03-10 14:35', '2022-03-10 14:38', '2022-03-10 14:41'],
        datasets: [{
            label: '율정초',
            data: [2.229, 2.377, 2.037, 2.011, 2.184, 2.361, 2.012, 2.363, 2.030, 2.381, 2.273, 2.055, 2.188, 2.159, 2.032, 
                    2.172, 2.145, 2.379, 2.392, 2.281, 2.246, 2.015, 2.351, 2.278, 2.164, 2.152, 2.117, 2.096, 2.253, 2.313],
            borderColor: [
                'rgba(255, 99, 132, 1)'
            ],
            fill: false,
            borderWidth: 3
        },
        {
            label: '율정 마을',
            data: [1.353, 1.282, 1.323, 1.216, 1.228, 1.488, 1.203, 1.206, 1.109, 1.338, 1.362, 1.150, 1.122, 1.593, 1.479, 
                    1.387, 1.593, 1.478, 1.144, 1.160, 1.497, 1.394, 1.558, 1.280, 1.171, 1.464, 1.323, 1.425, 1.534, 1.305],
            borderColor: [
                'rgb(75, 192, 192)',
            ],
            fill: false,
            borderWidth: 3,
        },
    ]
    },
    options: {
        scales: {
            x: [{
                type: 'time',
                time: {
                    unit: 'hour'
                },
            }],
            x: {
                min: 0,
                max: 29,
                ticks: {
                  maxRotation: 90
                }
            },
            y: {
                beginAtZero: true
            },
        }
    }
}

const myChart = new Chart(ctx, config);

// 차트 데이터 추가
function addData(chart, label, data) {
    chart.data.labels.push(label);
    chart.data.datasets.forEach((dataset) => {
        dataset.data.push(data);
    });
    chart.update();
}

// 차트 데이터 삭제
function removeData(chart) {
    chart.data.labels.pop();
    chart.data.datasets.forEach((dataset) => {
        dataset.data.pop();
    });
    chart.update();
}
*/

let isDragging = false;
let startXPos = 0;

// 차트 스크롤 이벤트 함수
function scroller(scroll, chart) {
    const dataLength = chart.getOption().xAxis[0].data.length;

    if(scroll.deltaY > 0) {
        if(chart.getOption().xAxis[0].max >= dataLength) {
            chart.setOption({
                xAxis: {
                    min: dataLength - 500,
                    max: dataLength
                }
            })

            /*
            chart.config.options.scales.x.min = dataLength - 29;
            chart.config.options.scales.x.max = dataLength;
            */
        } else {
            chart.setOption({
                xAxis: {
                    min: chart.getOption().xAxis[0].min + 25,
                    max: chart.getOption().xAxis[0].max + 25,
                }
            })

            /*
            chart.config.options.scales.x.min += 1;
            chart.config.options.scales.x.max += 1;            
            */
        }
    } else if (scroll.deltaY < 0) {
        if(chart.getOption().xAxis[0].min <=0 ) {
            chart.setOption({
                xAxis: {
                    min: 0,
                    max: 500
                }
            })

            /*
            chart.config.options.scales.x.min = 0;
            chart.config.options.scales.x.max = 29;
            */
        } else {
            chart.setOption({
                xAxis: {
                    min: chart.getOption().xAxis[0].min - 25,
                    max: chart.getOption().xAxis[0].max - 25,
                }
            }, false, false)

            /*
            chart.config.options.scales.x.min -= 1;
            chart.config.options.scales.x.max -= 1;
            */
        }
    } else {
        // '아무것도' 하지 않음
    }
}

function touchmover(touch, chart) {
    const dataLength = chart.getOption().xAxis[0].data.length;

    if(touch.zrX < startXPos) {
        if(chart.getOption().xAxis[0].max >= dataLength) {
            chart.setOption({
                xAxis: {
                    min: dataLength - 500,
                    max: dataLength
                }
            })

        } else {
            chart.setOption({
                xAxis: {
                    min: chart.getOption().xAxis[0].min + 25,
                    max: chart.getOption().xAxis[0].max + 25,
                }
            })
        }
    } else if (touch.zrX > startXPos) {
        if(chart.getOption().xAxis[0].min <=0 ) {
            chart.setOption({
                xAxis: {
                    min: 0,
                    max: 500
                }
            })
        } else {
            chart.setOption({
                xAxis: {
                    min: chart.getOption().xAxis[0].min - 25,
                    max: chart.getOption().xAxis[0].max - 25,
                }
            }, false, false)
        }
    } else {
        // '아무것도' 하지 않음
    }
}

function initializeChart() {
    let tmpChart = echarts.init(document.getElementById('myChart'));

    myChart = tmpChart

    // Specify the configuration items and data for the chart
    let option = {
        title: {
            show: true,
            text: '',
            textStyle: {
                fontFamily: 'Arial'
            }
        },
        legend: {
        type: 'scroll'
        },
        tooltip: {
            show: true
        },
        xAxis: {
        type: 'category',
        min: 0,
        max: 500,
        data: [],
        axisLabel: {
            rotate: 25,
        },
        },
        yAxis: {
        type: 'value'
        },
        series: [
        ]
    };

    // 차트에 마우스 휠 이벤트 추가
    tmpChart.getDom().addEventListener("wheel",(e) => {
        e.preventDefault();
        scroller(e, tmpChart);
    })

    // 차트에 터치 이벤트 추가
    tmpChart.getDom().addEventListener("touchstart",(e) => {
        e.preventDefault();
        isDragging = true;
        startXPos = e.zrX;
    })

    tmpChart.getDom().addEventListener("touchmove",(e) => {
        e.preventDefault();
        if(isDragging) {
            touchmover(e, tmpChart);
        }
    })

    tmpChart.getDom().addEventListener("touchend",(e) => {
        e.preventDefault();
        isDragging = false;
    })

    // Display the chart using the configuration items and data just specified.
    tmpChart.setOption(option);
}
