import React, { useEffect, useMemo, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useGlobalStore } from '@/store/global';
import dayjs from 'dayjs';
import { LineStyleMap } from '@/constants/monitor';
import { Flex } from '@chakra-ui/react';

// 修改动态导入方式，明确返回 ECharts 模块
const echarts = dynamic(() => import('echarts').then((mod) => mod as any), {
    ssr: false,
});

type MonitorChart = {
  data: {
    xData: string[];
    yData: {
      name: string;
      type: string;
      data: number[];
      lineStyleType?: string;
    }[];
  };
  type?: 'blue' | 'deepBlue' | 'green' | 'purple';
  title: string;
  yAxisLabelFormatter?: (value: number) => string;
  yDataFormatter?: (values: number[]) => number[];
  unit?: string;
};

const MonitorChart = ({
                        type,
                        data,
                        title,
                        yAxisLabelFormatter,
                        yDataFormatter,
                        unit
                      }: MonitorChart) => {
  const { screenWidth } = useGlobalStore();
  const chartDom = useRef<HTMLDivElement>(null);
  const myChart = useRef<any>(); // 调整为 any 类型避免类型检查问题

  // 生成 ECharts 配置
  const option = useMemo(
      () => ({
        tooltip: {
          trigger: 'axis',
          formatter: (params: any) => {
            let axisValue = params[0]?.axisValue;
            const content = params
                .map(
                    (item: any) =>
                        `${item?.marker} ${item?.seriesName}&nbsp; &nbsp;<span style="font-weight: 500">${
                            item?.value
                        }${unit ? unit : ''}</span>  <br/>`
                )
                .join('');
            return axisValue + '<br/>' + content;
          },
          position: (point: number[], _: any, dom: HTMLElement, __: any, size: { viewSize: number[] }) => {
            const [xPos, yPos] = point;
            const tooltipWidth = dom.offsetWidth;
            const chartWidth = size.viewSize[0];
            return [xPos + tooltipWidth > chartWidth ? xPos - tooltipWidth : Math.max(xPos, 0), yPos + 10];
          }
        },
        grid: {
          left: '0',
          bottom: '4px',
          top: '10px',
          right: '0',
          containLabel: true
        },
        xAxis: {
          type: 'category',
          data: data?.xData?.map((time) => dayjs(parseFloat(time) * 1000).format('HH:mm')),
          axisLabel: { color: '#667085' },
          axisLine: { lineStyle: { color: 'transparent' } },
          axisTick: { show: false }
        },
        yAxis: {
          type: 'value',
          axisLabel: { formatter: yAxisLabelFormatter }
        },
        series: data?.yData?.map((item, index) => ({
          name: item.name,
          data: item.data,
          type: 'line',
          showSymbol: false,
          areaStyle: { color: LineStyleMap[index % LineStyleMap.length].backgroundColor },
          lineStyle: {
            color: LineStyleMap[index % LineStyleMap.length].lineColor,
            type: item?.lineStyleType || 'solid'
          }
        }))
      }),
      [data, unit, yAxisLabelFormatter]
    );

    // 初始化图表时显式处理类型
    useEffect(() => {
        if (typeof window === 'undefined' || !chartDom.current) return;

        const initChart = async () => {
            const echarts = await import('echarts');
            myChart.current = echarts.init(chartDom.current!);
            myChart.current.setOption(option);
        };

        initChart();

        return () => {
            myChart.current?.dispose();
        };
    }, [option]);

    // 窗口大小变化时调整图表
    useEffect(() => {
        const handleResize = () => myChart.current?.resize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return <Flex ref={chartDom} w="full" h="full" />;
};

export default MonitorChart;