import { useEffect, useRef } from "react";
import PropTypes from "prop-types";
import * as echarts from "echarts";

/**
 * ECharts 인스턴스의 생성·갱신·정리를 React 컴포넌트 생명주기와 동기화한다.
 * echarts-for-react의 비동기 초기화 중 unmount되는 경쟁 상태를 피한다.
 */
export default function SafeECharts({ option, style }) {
  const containerRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    const chart = echarts.getInstanceByDom(container) ?? echarts.init(container);
    chartRef.current = chart;

    const resize = () => {
      if (!chart.isDisposed()) chart.resize();
    };
    window.addEventListener("resize", resize);

    let resizeObserver;
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(container);
    }

    return () => {
      window.removeEventListener("resize", resize);
      resizeObserver?.disconnect();
      if (chartRef.current === chart) chartRef.current = null;
      if (!chart.isDisposed()) chart.dispose();
    };
  }, []);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || chart.isDisposed()) return;
    chart.setOption(option, { notMerge: true });
  }, [option]);

  return <div ref={containerRef} style={style} />;
}

SafeECharts.propTypes = {
  option: PropTypes.object.isRequired,
  style: PropTypes.object,
};
