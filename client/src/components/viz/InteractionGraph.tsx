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

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = svgRef.current.clientWidth || 600;
    const height = svgRef.current.clientHeight || 320;

    // Simulation nodes & links (clone to avoid D3 mutation)
    const nodes: (GraphNode & d3.SimulationNodeDatum)[] = graph.nodes.map((n) => ({ ...n }));
    const links: (GraphEdge & d3.SimulationLinkDatum<typeof nodes[0]>)[] = graph.edges.map((e) => ({
      ...e,
      source: nodes.find((n) => n.id === e.source)!,
      target: nodes.find((n) => n.id === e.target)!,
    }));

    const simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id((d) => (d as GraphNode).id).distance(120))
      .force('charge', d3.forceManyBody().strength(-200))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide(50));

    // Edges
    const link = svg.append('g')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', (d) => SEVERITY_COLORS[d.severity] || '#4A5568')
      .attr('stroke-width', 2)
      .attr('stroke-opacity', 0.7)
      .attr('stroke-dasharray', (d) => d.severity === 'mild' ? '6 3' : 'none');

    // Edge labels
    const edgeLabel = svg.append('g')
      .selectAll('text')
      .data(links)
      .join('text')
      .attr('fill', (d) => SEVERITY_COLORS[d.severity])
      .attr('font-size', 9)
      .attr('font-family', 'JetBrains Mono')
      .attr('text-anchor', 'middle')
      .text((d) => d.severity);

    // Nodes
    const nodeGroup = svg.append('g')
      .selectAll('g')
      .data(nodes)
      .join('g')
      .attr('cursor', 'pointer')
      .on('mouseenter', (_, d) => onNodeHover?.(d.id))
      .on('mouseleave', () => onNodeHover?.(null));

    nodeGroup.append('circle')
      .attr('r', 32)
      .attr('fill', '#161D2F')
      .attr('stroke', (d) => d.status === 'active' ? '#00E5C3' : '#4A5568')
      .attr('stroke-width', 2);

    nodeGroup.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '-0.2em')
      .attr('fill', '#F0F4FF')
      .attr('font-size', 10)
      .attr('font-family', 'JetBrains Mono')
      .text((d) => d.label.split(' ')[0]);

    nodeGroup.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '1em')
      .attr('fill', '#8B97B0')
      .attr('font-size', 9)
      .attr('font-family', 'JetBrains Mono')
      .text((d) => d.label.split(' ').slice(1).join(' '));

    // Status indicator dot
    nodeGroup.append('circle')
      .attr('r', 5)
      .attr('cx', 22)
      .attr('cy', -22)
      .attr('fill', (d) => d.status === 'active' ? '#00E5C3' : '#4A5568');

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
      .selectAll<SVGCircleElement, GraphNode>('circle[r="32"]')
      .attr('stroke-width', (d) => d.id === hoveredNodeId ? 3 : 2)
      .attr('stroke', (d) => {
        if (d.id === hoveredNodeId) return '#F5A623';
        return d.status === 'active' ? '#00E5C3' : '#4A5568';
      });
  }, [hoveredNodeId]);

  return (
    <div className="relative w-full h-full">
      <svg ref={svgRef} width="100%" height="100%" />
      <div ref={tooltipRef} className="absolute hidden" />
    </div>
  );
}
