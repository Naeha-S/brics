import React, { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';

export function ForecastChart({ forecastData, locationLabel }) {
  const canvasRef = useRef(null);
  const chartInstanceRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');

    const gGrad = ctx.createLinearGradient(0, 0, 0, 130);
    gGrad.addColorStop(0, 'rgba(13, 148, 136, 0.20)');
    gGrad.addColorStop(1, 'rgba(13, 148, 136, 0.0)');

    // Ensure any chart attached to this canvas is safely destroyed first
    const existingChart = Chart.getChart(canvasRef.current);
    if (existingChart) {
      existingChart.destroy();
    }
    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
    }

    chartInstanceRef.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels: ['Now', '+6h', '+12h', '+18h', '+24h', '+36h', '+48h', '+72h'],
        datasets: [
          {
            label: 'PINN Physics Forecast (µg/m³)',
            data: forecastData.data,
            borderColor: '#0D9488',
            backgroundColor: gGrad,
            fill: true,
            tension: 0.35,
            pointRadius: 3,
            pointBackgroundColor: '#0D9488',
            borderWidth: 2
          },
          {
            label: 'CAMS Baseline Reanalysis (µg/m³)',
            data: forecastData.base,
            borderColor: '#94A3B8',
            borderDash: [4, 4],
            fill: false,
            tension: 0.3,
            pointRadius: 0,
            borderWidth: 1.5
          }
        ]
      },
      options: {
        plugins: {
          legend: {
            display: true,
            labels: { font: { size: 11, family: "'Inter', sans-serif" }, usePointStyle: true, boxWidth: 8 }
          }
        },
        scales: {
          y: {
            beginAtZero: false,
            min: 40,
            max: 330,
            grid: { color: '#E2E8F0' },
            ticks: { font: { size: 10, family: "'JetBrains Mono', monospace" } }
          },
          x: {
            grid: { display: false },
            ticks: { font: { size: 10, family: "'JetBrains Mono', monospace" } }
          }
        },
        responsive: true,
        maintainAspectRatio: false
      }
    });

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }
    };
  }, [forecastData]);

  return (
    <section className="card p-3.5 mt-3.5" aria-label="72-Hour Dispersion Forecast Chart">
      <div className="flex justify-between items-center mb-2">
        <div>
          <h3 className="text-xs font-bold tracking-wider uppercase text-[#0F172A]">
            72h PINN Atmospheric Forecast — {forecastData.label || locationLabel}
          </h3>
          <div className="text-[11px] text-[#64748B]">
            {forecastData.note}
          </div>
        </div>
        <span className="tag tag-warn">{forecastData.badge || 'Forecast Active'}</span>
      </div>
      <div className="h-[130px] w-full">
        <canvas ref={canvasRef} />
      </div>
    </section>
  );
}
