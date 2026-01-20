import { toSvg } from 'html-to-image';

/**
 * Generates an SVG data URL from a chart DOM element
 * @param element - The DOM element containing the chart
 * @returns A promise resolving to an SVG data URL (format: data:image/svg+xml;charset=utf-8,...)
 */
export async function generateChartImage(element: HTMLElement): Promise<string> {
  try {
    const dataUrl = await toSvg(element, {
      backgroundColor: '#ffffff',
      skipAutoScale: true,
    });
    return dataUrl;
  } catch (error) {
    console.error('Failed to generate chart SVG:', error);
    throw new Error('Failed to generate chart SVG');
  }
}

/**
 * Generates chart SVGs for all elements with a specific class
 * @param containerElement - Parent element containing charts
 * @param chartSelector - CSS selector for chart elements
 * @returns Map of element IDs to SVG data URLs
 */
export async function generateMultipleChartImages(
  containerElement: HTMLElement,
  chartSelector: string = '[data-chart-id]'
): Promise<Map<string, string>> {
  const charts = containerElement.querySelectorAll<HTMLElement>(chartSelector);
  const imageMap = new Map<string, string>();

  for (const chart of Array.from(charts)) {
    const chartId = chart.getAttribute('data-chart-id');
    if (!chartId) continue;

    try {
      const dataUrl = await generateChartImage(chart);
      imageMap.set(chartId, dataUrl);
    } catch (error) {
      console.error(`Failed to generate image for chart ${chartId}:`, error);
    }
  }

  return imageMap;
}
