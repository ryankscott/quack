import { describe, it, expect } from 'vitest';
import { getConfigOptionsForChartType } from './chart-config';
import type { ChartType } from './chart-config';

describe('getConfigOptionsForChartType', () => {
  it('should return correct options for bar chart', () => {
    const options = getConfigOptionsForChartType('bar');
    
    expect(options.showXAxisTitle).toBe(true);
    expect(options.showYAxisTitle).toBe(true);
    expect(options.xColumnLabel).toBe('X Axis Column');
    expect(options.yColumnLabel).toBe('Y Axis Column');
  });

  it('should return correct options for line chart', () => {
    const options = getConfigOptionsForChartType('line');
    
    expect(options.showXAxisTitle).toBe(true);
    expect(options.showYAxisTitle).toBe(true);
    expect(options.xColumnLabel).toBe('X Axis Column');
    expect(options.yColumnLabel).toBe('Y Axis Column');
  });

  it('should return correct options for area chart', () => {
    const options = getConfigOptionsForChartType('area');
    
    expect(options.showXAxisTitle).toBe(true);
    expect(options.showYAxisTitle).toBe(true);
    expect(options.xColumnLabel).toBe('X Axis Column');
    expect(options.yColumnLabel).toBe('Y Axis Column');
  });

  it('should return correct options for scatter chart', () => {
    const options = getConfigOptionsForChartType('scatter');
    
    expect(options.showXAxisTitle).toBe(true);
    expect(options.showYAxisTitle).toBe(true);
    expect(options.xColumnLabel).toBe('X Axis Column');
    expect(options.yColumnLabel).toBe('Y Axis Column');
  });

  it('should return correct options for pie chart', () => {
    const options = getConfigOptionsForChartType('pie');
    
    expect(options.showXAxisTitle).toBe(false);
    expect(options.showYAxisTitle).toBe(false);
    expect(options.xColumnLabel).toBe('Category');
    expect(options.yColumnLabel).toBe('Value');
  });

  it('should handle unknown chart types with default options', () => {
    const options = getConfigOptionsForChartType('unknown' as ChartType);
    
    expect(options.showXAxisTitle).toBe(true);
    expect(options.showYAxisTitle).toBe(true);
    expect(options.xColumnLabel).toBe('X Axis Column');
    expect(options.yColumnLabel).toBe('Y Axis Column');
  });

  describe('axis title visibility', () => {
    it('should show axis titles for cartesian charts', () => {
      const cartesianCharts: ChartType[] = ['bar', 'line', 'area', 'scatter'];
      
      cartesianCharts.forEach((chartType) => {
        const options = getConfigOptionsForChartType(chartType);
        expect(options.showXAxisTitle).toBe(true);
        expect(options.showYAxisTitle).toBe(true);
      });
    });

    it('should hide axis titles for pie chart', () => {
      const options = getConfigOptionsForChartType('pie');
      
      expect(options.showXAxisTitle).toBe(false);
      expect(options.showYAxisTitle).toBe(false);
    });
  });

  describe('column labels', () => {
    it('should use axis terminology for cartesian charts', () => {
      const cartesianCharts: ChartType[] = ['bar', 'line', 'area', 'scatter'];
      
      cartesianCharts.forEach((chartType) => {
        const options = getConfigOptionsForChartType(chartType);
        expect(options.xColumnLabel).toBe('X Axis Column');
        expect(options.yColumnLabel).toBe('Y Axis Column');
      });
    });

    it('should use category/value terminology for pie chart', () => {
      const options = getConfigOptionsForChartType('pie');
      
      expect(options.xColumnLabel).toBe('Category');
      expect(options.yColumnLabel).toBe('Value');
    });
  });
});
