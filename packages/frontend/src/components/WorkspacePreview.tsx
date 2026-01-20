import { useMemo, useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { CellState } from '@/hooks/useCellManager';
import RechartsChart from './RechartsChart';
import { generateChartImage } from '@/lib/chartImageGenerator';
import { generateMarkdownFromCells } from '@/lib/markdown-export';

// Custom components to allow data URLs in images
const markdownComponents = {
  img: ({ src, alt, ...props }: React.ImgHTMLAttributes<HTMLImageElement>) => (
    <img src={src} alt={alt} {...props} style={{ maxWidth: '100%' }} />
  ),
};

interface WorkspacePreviewProps {
  cells: CellState[];
  onChartImagesGenerated?: (cellId: string, imageUrl: string) => void;
}

/**
 * Preview mode display for workspace showing generated markdown with lazy chart image generation
 */
export function WorkspacePreview({ cells, onChartImagesGenerated }: WorkspacePreviewProps) {
  const [generatingImages, setGeneratingImages] = useState(false);
  const chartRefs = useRef<Map<string, HTMLDivElement>>(new Map());


  // Generate chart images lazily when preview is shown
  useEffect(() => {
    const generateImages = async () => {
      // Only generate images for cells that have displayMode === 'chart'
      const cellsNeedingImages = cells.filter(
        (cell) => cell.type === 'sql' && cell.displayMode === 'chart' && cell.chartConfig && cell.result && !cell.chartImageUrl
      );

      if (cellsNeedingImages.length === 0) {
        return;
      }

      setGeneratingImages(true);

      // Wait for the next frame to ensure refs are set after render
      await new Promise((resolve) => requestAnimationFrame(resolve));
      // Additional small delay to ensure charts are fully rendered
      await new Promise((resolve) => setTimeout(resolve, 100));

      for (const cell of cellsNeedingImages) {
        const chartElement = chartRefs.current.get(cell.id);
        if (chartElement) {
          try {
            // Wait a bit for chart to fully render
            await new Promise((resolve) => setTimeout(resolve, 500));
            const imageUrl = await generateChartImage(chartElement);
            if (imageUrl && onChartImagesGenerated) {
              onChartImagesGenerated(cell.id, imageUrl);
            }
          } catch (error) {
            console.error(`Failed to generate image for cell ${cell.id}:`, error);
          }
        }
      }

      setGeneratingImages(false);
    };

    generateImages();
  }, [cells, onChartImagesGenerated]);

  const markdownPreview = useMemo(() => {
    // Use shared markdown generation function without title for preview
    return generateMarkdownFromCells('', cells);
  }, [cells]);

  return (
    <div className="flex-1 overflow-y-auto p-4">
      {/* Hidden chart rendering area for image generation - uses fixed size charts */}
      {/* Using opacity:0 instead of visibility:hidden for html-to-image compatibility */}
      <div style={{ position: 'fixed', top: 0, left: 0, opacity: 0, pointerEvents: 'none', zIndex: -1 }}>
        {cells.map((cell) => {
          // Only render hidden charts for cells with displayMode === 'chart'
          if (cell.type === 'sql' && cell.displayMode === 'chart' && cell.chartConfig && cell.result && !cell.chartImageUrl) {
            return (
              <div
                key={cell.id}
                ref={(el) => {
                  if (el) chartRefs.current.set(cell.id, el);
                }}
                style={{ width: '800px', height: '400px', backgroundColor: '#ffffff', padding: '16px' }}
              >
                <RechartsChart
                  config={cell.chartConfig}
                  result={cell.result}
                  fixedSize={{ width: 768, height: 368 }}
                />
              </div>
            );
          }
          return null;
        })}
      </div>

      <div className="bg-white border border-quack-dark border-opacity-10 rounded-lg p-4 shadow-sm">
        <div className="text-xs uppercase text-quack-dark text-opacity-60 mb-2">
          Preview (Markdown)
          {generatingImages && (
            <span className="ml-2 text-quack-accent">Generating chart images...</span>
          )}
        </div>
        <div className="markdown-preview">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={markdownComponents}
            urlTransform={(url) => url}
          >
            {markdownPreview}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
