import { toPng } from 'html-to-image';

/**
 * Capture a chart element as a PNG data URL
 * @param element - The DOM element containing the chart
 * @returns A data URL string of the chart image
 */
export async function captureChartAsDataUrl(element: HTMLElement): Promise<string> {
  try {
    const dataUrl = await toPng(element, {
      backgroundColor: '#ffffff',
      pixelRatio: 2, // Higher quality
      cacheBust: true,
    });
    return dataUrl;
  } catch (error) {
    console.error('Failed to capture chart:', error);
    throw new Error('Failed to capture chart image');
  }
}

/**
 * Find chart elements by cell ID and capture them as data URLs
 * @param cellId - The cell ID to find the chart for
 * @returns A data URL string or null if chart not found
 */
export async function captureChartByCellId(cellId: string): Promise<string | null> {
  // Find the chart viewer element for this cell
  // We'll look for a data attribute that identifies the cell
  const cellElement = document.querySelector(`[data-cell-id="${cellId}"]`);
  if (!cellElement) {
    console.warn(`Cell element not found for ID: ${cellId}`);
    return null;
  }

  // Find the chart viewer within the cell
  const chartElement = cellElement.querySelector('[data-chart-viewer]');
  if (!chartElement || !(chartElement instanceof HTMLElement)) {
    console.warn(`Chart element not found for cell ID: ${cellId}`);
    return null;
  }

  try {
    return await captureChartAsDataUrl(chartElement);
  } catch (error) {
    console.error(`Failed to capture chart for cell ${cellId}:`, error);
    return null;
  }
}
