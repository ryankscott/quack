import { describe, it, expect } from 'vitest';
import { getConfigOptionsForChartType, pivotDataForGrouping } from './chart-config';
import type { ChartType } from './chart-config';

describe('getConfigOptionsForChartType', () => {
  it('should return correct options for bar chart', () => {
    const options = getConfigOptionsForChartType('bar');
    
    expect(options.showXAxisTitle).toBe(true);
    expect(options.showYAxisTitle).toBe(true);
    expect(options.xColumnLabel).toBe('X Axis Column');
    expect(options.yColumnLabel).toBe('Y Axis Column');
    expect(options.supportsGrouping).toBe(true);
  });

  it('should return correct options for line chart', () => {
    const options = getConfigOptionsForChartType('line');
    
    expect(options.showXAxisTitle).toBe(true);
    expect(options.showYAxisTitle).toBe(true);
    expect(options.xColumnLabel).toBe('X Axis Column');
    expect(options.yColumnLabel).toBe('Y Axis Column');
    expect(options.supportsGrouping).toBe(false);
  });

  it('should return correct options for area chart', () => {
    const options = getConfigOptionsForChartType('area');
    
    expect(options.showXAxisTitle).toBe(true);
    expect(options.showYAxisTitle).toBe(true);
    expect(options.xColumnLabel).toBe('X Axis Column');
    expect(options.yColumnLabel).toBe('Y Axis Column');
    expect(options.supportsGrouping).toBe(true);
  });

  it('should return correct options for scatter chart', () => {
    const options = getConfigOptionsForChartType('scatter');
    
    expect(options.showXAxisTitle).toBe(true);
    expect(options.showYAxisTitle).toBe(true);
    expect(options.xColumnLabel).toBe('X Axis Column');
    expect(options.yColumnLabel).toBe('Y Axis Column');
    expect(options.supportsGrouping).toBe(false);
  });

  it('should return correct options for pie chart', () => {
    const options = getConfigOptionsForChartType('pie');
    
    expect(options.showXAxisTitle).toBe(false);
    expect(options.showYAxisTitle).toBe(false);
    expect(options.xColumnLabel).toBe('Category');
    expect(options.yColumnLabel).toBe('Value');
    expect(options.supportsGrouping).toBe(false);
  });

  it('should handle unknown chart types with default options', () => {
    const options = getConfigOptionsForChartType('unknown' as ChartType);
    
    expect(options.showXAxisTitle).toBe(true);
    expect(options.showYAxisTitle).toBe(true);
    expect(options.xColumnLabel).toBe('X Axis Column');
    expect(options.yColumnLabel).toBe('Y Axis Column');
    expect(options.supportsGrouping).toBe(false);
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

  describe('grouping support', () => {
    it('should support grouping for bar and area charts', () => {
      expect(getConfigOptionsForChartType('bar').supportsGrouping).toBe(true);
      expect(getConfigOptionsForChartType('area').supportsGrouping).toBe(true);
    });

    it('should not support grouping for line, scatter, and pie charts', () => {
      expect(getConfigOptionsForChartType('line').supportsGrouping).toBe(false);
      expect(getConfigOptionsForChartType('scatter').supportsGrouping).toBe(false);
      expect(getConfigOptionsForChartType('pie').supportsGrouping).toBe(false);
    });
  });
});

describe('pivotDataForGrouping', () => {
  it('should pivot data by group column', () => {
    const input = [
      { month: 'Jan', sales: 100, region: 'East' },
      { month: 'Jan', sales: 200, region: 'West' },
      { month: 'Feb', sales: 150, region: 'East' },
      { month: 'Feb', sales: 250, region: 'West' },
    ];

    const result = pivotDataForGrouping(input, 'month', 'sales', 'region');

    expect(result.groups).toEqual(['East', 'West']);
    expect(result.data).toHaveLength(2);
    expect(result.data[0]).toEqual({ x: 'Jan', East: 100, West: 200 });
    expect(result.data[1]).toEqual({ x: 'Feb', East: 150, West: 250 });
  });

  it('should handle missing group values with 0', () => {
    const input = [
      { month: 'Jan', sales: 100, region: 'East' },
      { month: 'Feb', sales: 150, region: 'East' },
      { month: 'Feb', sales: 250, region: 'West' },
    ];

    const result = pivotDataForGrouping(input, 'month', 'sales', 'region');

    expect(result.groups).toEqual(['East', 'West']);
    expect(result.data).toHaveLength(2);
    expect(result.data[0]).toEqual({ x: 'Jan', East: 100, West: 0 });
    expect(result.data[1]).toEqual({ x: 'Feb', East: 150, West: 250 });
  });

  it('should handle null/undefined group values as "Unknown"', () => {
    const input = [
      { month: 'Jan', sales: 100, region: 'East' },
      { month: 'Jan', sales: 200, region: null },
      { month: 'Feb', sales: 150, region: undefined },
    ];

    const result = pivotDataForGrouping(input, 'month', 'sales', 'region');

    expect(result.groups).toEqual(['East', 'Unknown']);
    expect(result.data).toHaveLength(2);
    expect(result.data[0]).toEqual({ x: 'Jan', East: 100, Unknown: 200 });
    expect(result.data[1]).toEqual({ x: 'Feb', East: 0, Unknown: 150 });
  });

  it('should convert y values to numbers', () => {
    const input = [
      { month: 'Jan', sales: '100', region: 'East' },
      { month: 'Jan', sales: '200', region: 'West' },
    ];

    const result = pivotDataForGrouping(input, 'month', 'sales', 'region');

    expect(result.data[0]).toEqual({ x: 'Jan', East: 100, West: 200 });
  });

  it('should handle non-numeric y values as 0', () => {
    const input = [
      { month: 'Jan', sales: 'invalid', region: 'East' },
      { month: 'Jan', sales: 200, region: 'West' },
    ];

    const result = pivotDataForGrouping(input, 'month', 'sales', 'region');

    expect(result.data[0]).toEqual({ x: 'Jan', East: 0, West: 200 });
  });

  it('should sort groups alphabetically', () => {
    const input = [
      { month: 'Jan', sales: 100, region: 'West' },
      { month: 'Jan', sales: 200, region: 'East' },
      { month: 'Jan', sales: 150, region: 'North' },
    ];

    const result = pivotDataForGrouping(input, 'month', 'sales', 'region');

    expect(result.groups).toEqual(['East', 'North', 'West']);
  });
});
