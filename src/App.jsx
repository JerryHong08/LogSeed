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
  setHoveredNodeInfo,
}) => {
  const graphRef = useRef(null);
  const containerRef = useRef(null);
  const hoveredByMouse = useRef(false);

  useEffect(() => {
    let animationId;
    let lastAutoHoverId = null;

    function autoHighlight() {
      if (!graphRef.current) return;
      // 如果鼠标悬停则不自动高亮
      if (hoveredByMouse.current) {
        animationId = requestAnimationFrame(autoHighlight);
        return;
      }
      const camera = graphRef.current.camera();
      const nodes = data.nodes;
      if (!camera || !nodes || nodes.length === 0) {
        animationId = requestAnimationFrame(autoHighlight);
        return;
      }
      // 相机朝向
      const camPos = camera.position;
      const camDir = new THREE.Vector3();
      camera.getWorldDirection(camDir);

      // 找到视野中心最近的节点
      let minAngle = Infinity;
      let closestNode = null;
      nodes.forEach((node) => {
        const nodeVec = new THREE.Vector3(node.x, node.y, node.z).sub(camPos).normalize();
        const angle = camDir.angleTo(nodeVec);
        if (angle < minAngle) {
          minAngle = angle;
          closestNode = node;
        }
      });

      // 只在节点变化时才触发
      if (closestNode && closestNode.id !== lastAutoHoverId) {
        lastAutoHoverId = closestNode.id;
        // 解析主编号和子编号
        let main = '', sub = '', current = '';
        if (closestNode.type === 'core') {
          const match = closestNode.name.match(/(\d+)/);
          main = match ? match[1] : '';
          current = main;
        } else if (closestNode.type === 'sub') {
          const match = closestNode.name.match(/(\d+)-(\d+)/);
          if (match) {
            main = match[1];
            sub = match[2];
            current = `${main}-${sub}`;
          }
        }
        setHoveredNodeInfo({ main, sub, current, type: closestNode.type });
      }
      animationId = requestAnimationFrame(autoHighlight);
    }

    animationId = requestAnimationFrame(autoHighlight);

    return () => {
      if (animationId) cancelAnimationFrame(animationId);
    };
  }, [data, setHoveredNodeInfo]);

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
          // 鼠标悬停优先
          hoveredByMouse.current = !!node;
          if (setHoveredNodeInfo) {
            if (node && node.name) {
              let main = '', sub = '', current = '';
              if (node.type === 'core') {
                const match = node.name.match(/(\d+)/);
                main = match ? match[1] : '';
                current = main;
              } else if (node.type === 'sub') {
                const match = node.name.match(/(\d+)-(\d+)/);
                if (match) {
                  main = match[1];
                  sub = match[2];
                  current = `${main}-${sub}`;
                }
              }
              setHoveredNodeInfo({ main, sub, current, type: node.type });
            } else {
              setHoveredNodeInfo(null);
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
        hoveredByMouse.current = !!node;
        if (setHoveredNodeInfo) {
          if (node && node.name) {
            let main = '', sub = '', current = '';
            if (node.type === 'core') {
              const match = node.name.match(/(\d+)/);
              main = match ? match[1] : '';
              current = main;
            } else if (node.type === 'sub') {
              const match = node.name.match(/(\d+)-(\d+)/);
              if (match) {
                main = match[1];
                sub = match[2];
                current = `${main}-${sub}`;
              }
            }
            setHoveredNodeInfo({ main, sub, current, type: node.type });
          } else {
            setHoveredNodeInfo(null);
          }
        }
      });
    }
  }, [data, chargeStrength, linkDistance, nodeOpacity, setHoveredNodeInfo]);

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
  const [hoveredNodeInfo, setHoveredNodeInfo] = useState(null);
  const [panelCollapsed, setPanelCollapsed] = useState(false);

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

  // 标签渲染
  const renderTagTabs = () => {
    if (!hoveredNodeInfo || !hoveredNodeInfo.main) return null;
    const { main, sub, current, type } = hoveredNodeInfo;
    // 查找主球颜色
    let mainColor = '#FFD93D';
    const mainNode = data.nodes.find(n => n.type === 'core' && n.name.endsWith(main));
    if (mainNode) mainColor = mainNode.color;

    // 生成主标签
    const tags = [{
      label: main,
      key: main,
      highlight: type === 'core' || !sub,
      level: 0,
      color: mainColor,
      progress: Math.random(), // 主标签进度
    }];

    // 生成当前子标签
    let subNum = Number(sub);
    if (subNum) {
      tags.push({
        label: `${main}-${subNum}`,
        key: `${main}-${subNum}`,
        highlight: true,
        level: 1,
        color: mainColor,
        progress: Math.random(),
      });
      // 随机生成几个不同的子标签（不包括当前subNum和之前的）
      const maxSub = data.nodes
        .filter(n => n.type === 'sub' && n.name.startsWith(`子知识点 ${main}-`))
        .map(n => {
          const m = n.name.match(/-(\d+)$/);
          return m ? Number(m[1]) : null;
        })
        .filter(Boolean)
        .reduce((a, b) => Math.max(a, b), 0);

      // 可选的sub编号
      const availableSubs = [];
      for (let i = 1; i <= maxSub; i++) {
        if (i !== subNum && i > subNum) availableSubs.push(i);
      }
      // 随机选2~4个
      const randomSubs = [];
      const count = Math.min(availableSubs.length, Math.floor(Math.random() * 3) + 2);
      while (randomSubs.length < count && availableSubs.length > 0) {
        const idx = Math.floor(Math.random() * availableSubs.length);
        randomSubs.push(availableSubs[idx]);
        availableSubs.splice(idx, 1);
      }
      randomSubs.forEach(i => {
        tags.push({
          label: `${main}-${i}`,
          key: `${main}-${i}`,
          highlight: false,
          level: 1,
          color: mainColor,
          progress: Math.random(),
        });
      });
    }

    // 阶梯排布+进度条
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: 12,
        minWidth: 60,
      }}>
        {tags.map((tag, idx) => (
          <div
            key={tag.key}
            style={{
              background: tag.highlight ? '#FFD93D' : tag.color,
              color: tag.highlight ? '#222' : '#fff',
              padding: '8px 20px 8px 20px',
              borderRadius: '16px 16px 0 16px',
              fontWeight: 'bold',
              fontSize: '1.1rem',
              boxShadow: tag.highlight ? '0 2px 8px rgba(0,0,0,0.18)' : 'none',
              minWidth: 70,
              textAlign: 'center',
              marginLeft: tag.level * 32,
              border: tag.highlight ? '2px solid #FFD93D' : '2px solid transparent',
              transition: 'all 0.2s',
              zIndex: tag.highlight ? 2 : 1,
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* 进度条底色 */}
            <div
              style={{
                position: 'absolute',
                left: 0,
                bottom: 0,
                height: 6,
                width: '100%',
                background: 'rgba(255,255,255,0.15)',
                borderRadius: 3,
              }}
            />
            {/* 进度条前景 */}
            <div
              style={{
                position: 'absolute',
                left: 0,
                bottom: 0,
                height: 6,
                width: `${Math.round(tag.progress * 100)}%`,
                background: tag.highlight ? '#FF6B6B' : '#fff',
                borderRadius: 3,
                transition: 'width 0.3s',
                opacity: 0.85,
              }}
            />
            <span style={{ position: 'relative', zIndex: 2 }}>{tag.label}</span>
          </div>
        ))}
      </div>
    );
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
          minHeight: 48,
        }}
      >
        {renderTagTabs()}
      </div>
      <div className={`flex flex-col ${panelCollapsed ? 'w-6' : 'w-64'} flex-shrink-0 transition-all duration-300`}>
        {/* 控制面板收缩按钮 */}
        <button
          onClick={() => setPanelCollapsed(c => !c)}
          style={{
            width: 24,
            height: 32,
            background: '#222',
            color: '#FFD93D',
            border: 'none',
            borderRadius: '0 0 8px 0',
            position: 'absolute',
            left: panelCollapsed ? 0 : 256,
            top: 0,
            zIndex: 100,
            cursor: 'pointer',
            transition: 'left 0.3s',
          }}
          tabIndex={0}
          aria-label={panelCollapsed ? '展开面板' : '收起面板'}
        >
          {panelCollapsed ? '▶' : '◀'}
        </button>
        {/* 调控面板 */}
        <div
          className={`p-4 bg-gray-800 shadow-lg flex-1 overflow-y-auto transition-all duration-300`}
          style={{
            display: panelCollapsed ? 'none' : 'block',
            minWidth: 100,
          }}
        >
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
          setHoveredNodeInfo={setHoveredNodeInfo}
          onSnapshot={handleSnapshot}
        />
      </div>
    </div>
  );
};

export default App;