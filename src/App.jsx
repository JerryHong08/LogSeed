import { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import ForceGraph3D from '3d-force-graph';
import { forceManyBody, forceCenter, forceLink, forceRadial } from 'd3-force-3d';
import './index.css';

// 数据生成函数
const generateGraphData = (
  numCoreNodes,
  numSubNodesPerCore,
  coreNodeSizeRange,
  subNodeSizeRange
) => {
  const nodes = [];
  const links = [];
  const colors = [
    '#FF6B6B', // Coral Red
    '#4ECDC4', // Turquoise
    '#FFD93D', // Yellow
    '#6B48FF', // Purple
    '#FF9F40', // Orange
    '#00C4FF', // Sky Blue
    '#F06292', // Pink
    '#A2FF86', // Light Green
    '#FF5C5C', // Red
    '#40C4FF', // Light Blue
  ];

  for (let i = 0; i < numCoreNodes; i++) {
    nodes.push({
      id: `core_${i}`,
      name: `核心知识点 ${i + 1}`,
      size:
        coreNodeSizeRange[0] +
        Math.random() * (coreNodeSizeRange[1] - coreNodeSizeRange[0]),
      color: colors[Math.floor(Math.random() * colors.length)],
      type: 'core',
    });
  }

  nodes.forEach((coreNode) => {
    if (coreNode.type === 'core') {
      for (let j = 0; j < numSubNodesPerCore; j++) {
        const subNodeId = `${coreNode.id}_sub_${j}`;
        nodes.push({
          id: subNodeId,
          name: `子知识点 ${coreNode.name.split(' ')[1]}-${j + 1}`,
          size:
            subNodeSizeRange[0] +
            Math.random() * (subNodeSizeRange[1] - subNodeSizeRange[0]),
          color: coreNode.color,
          type: 'sub',
        });
        links.push({ source: coreNode.id, target: subNodeId });
      }
    }
  });

  for (let i = 0; i < numCoreNodes; i++) {
    for (let j = i + 1; j < numCoreNodes; j++) {
      if (Math.random() < 0.3) {
        links.push({ source: `core_${i}`, target: `core_${j}` });
      }
    }
  }

  nodes.forEach((node) => {
    const u = Math.random();
    const v = Math.random();
    const theta = 2 * Math.PI * u;
    const phi = Math.acos(2 * v - 1);
    const radius = 100 + Math.random() * 20;
    node.x = radius * Math.sin(phi) * Math.cos(theta);
    node.y = radius * Math.sin(phi) * Math.sin(theta);
    node.z = radius * Math.cos(phi);
  });

  return { nodes, links };
};

// 图谱组件
const KnowledgeGraph = ({
  data,
  chargeStrength,
  linkDistance,
  nodeOpacity,
  setHoveredNodeLabel, // 新增
}) => {
  const graphRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!graphRef.current) {
      graphRef.current = ForceGraph3D()(containerRef.current)
        .graphData(data)
        .nodeLabel('name')
        .nodeThreeObject((node) => {
          const sphere = new THREE.Mesh(
            new THREE.SphereGeometry(node.size / 2),
            new THREE.MeshLambertMaterial({
              color: node.color,
              transparent: true,
              opacity: nodeOpacity,
            })
          );
          return sphere;
        })
        .linkWidth(1)
        .backgroundColor('#000000')
        .forceEngine('d3')
        .d3Force('charge', forceManyBody().strength(chargeStrength))
        .d3Force('center', forceCenter().strength(0.1))
        .d3Force('link', forceLink().distance(linkDistance))
        .d3Force('radial', forceRadial(100).strength(0.1))
        .warmupTicks(100)
        .onNodeClick((node) => {
          alert(`你点击了: ${node.name}`);
        })
        .onNodeHover((node) => {
          // 新增：悬停时设置标签
          if (setHoveredNodeLabel) {
            if (node && node.name) {
              // 提取数字部分
              const match = node.name.match(/\d+(-\d+)?/);
              setHoveredNodeLabel(match ? match[0] : node.name);
            } else {
              setHoveredNodeLabel('');
            }
          }
        });

      const light = new THREE.DirectionalLight(0xffffff, 1);
      light.position.set(0, 10, 10);
      graphRef.current.scene().add(light);

      graphRef.current.cameraPosition({ z: 300 });
    } else {
      graphRef.current.graphData(data);
      graphRef.current.d3Force('charge').strength(chargeStrength);
      graphRef.current.d3Force('link').distance(linkDistance);
      graphRef.current.d3Force('radial').strength(0.1);
      graphRef.current.nodeThreeObject((node) => {
        const sphere = new THREE.Mesh(
          new THREE.SphereGeometry(node.size / 2),
          new THREE.MeshLambertMaterial({
            color: node.color,
            transparent: true,
            opacity: nodeOpacity,
          })
        );
        return sphere;
      });
      // 新增：更新悬停事件
      graphRef.current.onNodeHover((node) => {
        if (setHoveredNodeLabel) {
          if (node && node.name) {
            const match = node.name.match(/\d+(-\d+)?/);
            setHoveredNodeLabel(match ? match[0] : node.name);
          } else {
            setHoveredNodeLabel('');
          }
        }
      });
    }
  }, [data, chargeStrength, linkDistance, nodeOpacity, setHoveredNodeLabel]);

  return (
    <div className="relative h-full">
      <div ref={containerRef} id="graph" />
    </div>
  );
};

// 主应用组件
const App = () => {
  const [numCoreNodes, setNumCoreNodes] = useState(10);
  const [numSubNodes, setNumSubNodes] = useState(9);
  const [chargeStrength, setChargeStrength] = useState(-50);
  const [linkDistance, setLinkDistance] = useState(30);
  const [nodeOpacity, setNodeOpacity] = useState(1);
  const [coreNodeSizeRange, setCoreNodeSizeRange] = useState([15, 20]);
  const [subNodeSizeRange, setSubNodeSizeRange] = useState([5, 10]);
  const [data, setData] = useState(
    generateGraphData(numCoreNodes, numSubNodes, coreNodeSizeRange, subNodeSizeRange)
  );
  const [hoveredNodeLabel, setHoveredNodeLabel] = useState('');

  const handleGenerate = () => {
    setData(
      generateGraphData(numCoreNodes, numSubNodes, coreNodeSizeRange, subNodeSizeRange)
    );
  };

  const handleSnapshot = (snapshotData) => {
    setSnapshots((prev) => [
      ...prev,
      {
        timestamp: new Date().toLocaleString('zh-CN'),
        data: snapshotData.data,
        camera: snapshotData.camera,
        params: {
          numCoreNodes,
          numSubNodes,
          chargeStrength,
          linkDistance,
          nodeOpacity,
          coreNodeSizeRange,
          subNodeSizeRange,
        },
      },
    ]);
  };


  return (
    <div className="flex h-screen bg-gray-900 text-white">
      {/* 右上角标签 */}
      <div
        style={{
          position: 'fixed',
          top: 24,
          right: 32,
          zIndex: 50,
          pointerEvents: 'none',
        }}
      >
        {hoveredNodeLabel && (
          <div
            style={{
              background: '#FFD93D',
              color: '#222',
              padding: '8px 20px',
              borderRadius: '16px 16px 0 16px',
              fontWeight: 'bold',
              fontSize: '1.2rem',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              minWidth: 48,
              textAlign: 'center',
              transition: 'opacity 0.2s',
            }}
          >
            {hoveredNodeLabel}
          </div>
        )}
      </div>
      <div className="flex flex-col w-64 flex-shrink-0">
        {/* 调控面板 */}
        <div className="p-4 bg-gray-800 shadow-lg flex-1 overflow-y-auto">
          <h2 className="text-xl font-bold mb-4">调控面板</h2>
          <div className="mb-4">
            <label className="block mb-1">核心节点数: {numCoreNodes}</label>
            <input
              type="range"
              min="5"
              max="20"
              value={numCoreNodes}
              onChange={(e) => setNumCoreNodes(Number(e.target.value))}
              className="w-full"
            />
          </div>
          <div className="mb-4">
            <label className="block mb-1">子节点数/核心: {numSubNodes}</label>
            <input
              type="range"
              min="5"
              max="15"
              value={numSubNodes}
              onChange={(e) => setNumSubNodes(Number(e.target.value))}
              className="w-full"
            />
          </div>
          <div className="mb-4">
            <label className="block mb-1">斥力强度: {chargeStrength}</label>
            <input
              type="range"
              min="-100"
              max="-10"
              value={chargeStrength}
              onChange={(e) => setChargeStrength(Number(e.target.value))}
              className="w-full"
            />
          </div>
          <div className="mb-4">
            <label className="block mb-1">链接距离: {linkDistance}</label>
            <input
              type="range"
              min="10"
              max="50"
              value={linkDistance}
              onChange={(e) => setLinkDistance(Number(e.target.value))}
              className="w-full"
            />
          </div>
          <div className="mb-4">
            <label className="block mb-1">节点透明度: {nodeOpacity.toFixed(2)}</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={nodeOpacity}
              onChange={(e) => setNodeOpacity(Number(e.target.value))}
              className="w-full"
            />
          </div>
          <div className="mb-4">
            <label className="block mb-1">
              核心节点尺寸: {coreNodeSizeRange[0]}-{coreNodeSizeRange[1]}
            </label>
            <input
              type="range"
              min="10"
              max="30"
              value={coreNodeSizeRange[1]}
              onChange={(e) =>
                setCoreNodeSizeRange([coreNodeSizeRange[0], Number(e.target.value)])
              }
              className="w-full"
            />
          </div>
          <div className="mb-4">
            <label className="block mb-1">
              子节点尺寸: {subNodeSizeRange[0]}-{subNodeSizeRange[1]}
            </label>
            <input
              type="range"
              min="5"
              max="15"
              value={subNodeSizeRange[1]}
              onChange={(e) =>
                setSubNodeSizeRange([subNodeSizeRange[0], Number(e.target.value)])
              }
              className="w-full"
            />
          </div>
          <button
            onClick={handleGenerate}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded"
          >
            重新生成图谱
          </button>
        </div>

      </div>
      <div className="flex-1 h-full">
        <KnowledgeGraph
          data={data}
          chargeStrength={chargeStrength}
          linkDistance={linkDistance}
          nodeOpacity={nodeOpacity}
          setHoveredNodeLabel={setHoveredNodeLabel} // 新增
          onSnapshot={handleSnapshot}
        />
      </div>
    </div>
  );
};

export default App;