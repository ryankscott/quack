import { toPng } from 'html-to-image';

/**
 * Generates a PNG data URL from a chart DOM element
 * @param element - The DOM element containing the chart
 * @returns A promise resolving to a base64 PNG data URL
 */
export async function generateChartImage(element: HTMLElement): Promise<string> {
  try {
    const dataUrl = await toPng(element, {
      backgroundColor: '#ffffff',
      pixelRatio: 2, // Higher resolution for better quality
      skipAutoScale: true,
    });
    return dataUrl;
  } catch (error) {
    console.error('Failed to generate chart image:', error);
    throw new Error('Failed to generate chart image');
  }
}

/**
 * Generates chart images for all elements with a specific class
 * @param containerElement - Parent element containing charts
 * @param chartSelector - CSS selector for chart elements
 * @returns Map of element IDs to data URLs
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
