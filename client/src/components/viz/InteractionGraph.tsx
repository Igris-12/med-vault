import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import type { InteractionGraph, GraphNode, GraphEdge } from '../../types/api';

const SEVERITY_COLORS: Record<string, string> = {
  none: '#4A5568',
  mild: '#00E5C3',
  moderate: '#F5A623',
  severe: '#FF4A6E',
};

interface Props {
  graph: InteractionGraph;
  hoveredNodeId?: string | null;
  onNodeHover?: (id: string | null) => void;
}

export function InteractionGraph({ graph, hoveredNodeId, onNodeHover }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!svgRef.current || graph.nodes.length === 0) return;

    const width = svgRef.current.clientWidth || 600;
    const height = svgRef.current.clientHeight || 320;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // Definitions for drop shadow and gradients
    const defs = svg.append('defs');
    const filter = defs.append('filter')
      .attr('id', 'node-shadow')
      .attr('x', '-20%').attr('y', '-20%').attr('width', '140%').attr('height', '140%');
    filter.append('feDropShadow')
      .attr('dx', '0')
      .attr('dy', '6')
      .attr('stdDeviation', '8')
      .attr('flood-color', '#000000')
      .attr('flood-opacity', '0.15');

    const container = svg.append('g');

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 4])
      .on('zoom', (event) => {
        container.attr('transform', event.transform);
      });
    svg.call(zoom);

    // Simulation nodes & links (clone to avoid D3 mutation)
    const nodes: (GraphNode & d3.SimulationNodeDatum)[] = graph.nodes.map((n) => ({ ...n }));
    const links: (GraphEdge & d3.SimulationLinkDatum<typeof nodes[0]>)[] = graph.edges.map((e) => ({
      ...e,
      source: nodes.find((n) => n.id === e.source)!,
      target: nodes.find((n) => n.id === e.target)!,
    }));

    // More compact forces
    const simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id((d) => (d as GraphNode).id).distance(110))
      .force('charge', d3.forceManyBody().strength(-150))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide(55));

    // Edges
    const link = container.append('g')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', (d) => SEVERITY_COLORS[d.severity] || '#4A5568')
      .attr('stroke-width', 2.5)
      .attr('stroke-opacity', 0.8)
      .attr('stroke-dasharray', (d) => d.severity === 'mild' ? '6 4' : 'none');

    // Edge labels
    const edgeLabel = container.append('g')
      .selectAll('text')
      .data(links)
      .join('text')
      .attr('fill', (d) => SEVERITY_COLORS[d.severity])
      .attr('font-size', 10)
      .attr('font-weight', 600)
      .attr('font-family', 'Inter, system-ui, sans-serif')
      .attr('text-anchor', 'middle')
      .text((d) => d.severity.toUpperCase());

    // Nodes
    const nodeGroup = container.append('g')
      .selectAll('g')
      .data(nodes)
      .join('g')
      .attr('cursor', 'grab')
      .on('mouseenter', (_, d) => onNodeHover?.(d.id))
      .on('mouseleave', () => onNodeHover?.(null));

    // Drag behavior
    const drag = d3.drag<SVGGElement, (GraphNode & d3.SimulationNodeDatum)>()
      .on('start', (event, d) => {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
        d3.select(event.sourceEvent.target.parentNode).attr('cursor', 'grabbing');
      })
      .on('drag', (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on('end', (event, d) => {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
        d3.select(event.sourceEvent.target.parentNode).attr('cursor', 'grab');
      });

    nodeGroup.call(drag);

    nodeGroup.append('circle')
      .attr('r', 36)
      .attr('fill', '#1e293b') // sleek slate-800
      .attr('stroke', (d) => d.status === 'active' ? '#14b8a6' : '#64748b') // teal-500 or slate-500
      .attr('stroke-width', 3)
      .attr('filter', 'url(#node-shadow)');

    nodeGroup.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '-0.1em')
      .attr('fill', '#f8fafc')
      .attr('font-size', 11)
      .attr('font-weight', 600)
      .attr('font-family', 'Inter, system-ui, sans-serif')
      .text((d) => d.label.split(' ')[0]);

    nodeGroup.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '1.3em')
      .attr('fill', '#94a3b8')
      .attr('font-size', 9)
      .attr('font-family', 'Inter, system-ui, sans-serif')
      .text((d) => d.label.split(' ').slice(1).join(' '));

    // Status indicator dot
    nodeGroup.append('circle')
      .attr('r', 6)
      .attr('cx', 24)
      .attr('cy', -24)
      .attr('fill', (d) => d.status === 'active' ? '#14b8a6' : '#64748b')
      .attr('stroke', '#1e293b')
      .attr('stroke-width', 2);

    simulation.on('tick', () => {
      link
        .attr('x1', (d) => (d.source as d3.SimulationNodeDatum).x!)
        .attr('y1', (d) => (d.source as d3.SimulationNodeDatum).y!)
        .attr('x2', (d) => (d.target as d3.SimulationNodeDatum).x!)
        .attr('y2', (d) => (d.target as d3.SimulationNodeDatum).y!);

      edgeLabel
        .attr('x', (d) => (((d.source as d3.SimulationNodeDatum).x! + (d.target as d3.SimulationNodeDatum).x!) / 2))
        .attr('y', (d) => (((d.source as d3.SimulationNodeDatum).y! + (d.target as d3.SimulationNodeDatum).y!) / 2));

      nodeGroup.attr('transform', (d) => `translate(${d.x},${d.y})`);
    });

    return () => { simulation.stop(); };
  }, [graph, onNodeHover]);

  // Highlight hovered node
  useEffect(() => {
    if (!svgRef.current) return;
    d3.select(svgRef.current)
      .selectAll<SVGCircleElement, GraphNode>('circle[r="36"]')
      .attr('stroke-width', (d) => d.id === hoveredNodeId ? 4 : 3)
      .attr('stroke', (d) => {
        if (d.id === hoveredNodeId) return '#F5A623';
        return d.status === 'active' ? '#14b8a6' : '#64748b';
      });
  }, [hoveredNodeId]);

  return (
    <div className="relative w-full h-full">
      <svg ref={svgRef} width="100%" height="100%" />
      <div ref={tooltipRef} className="absolute hidden" />
    </div>
  );
}
