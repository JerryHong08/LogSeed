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

// 新增：根据AI返回的任务数据生成图谱数据
const buildGraphDataFromTasks = (coreTasks, subTasksList, coreNodeSizeRange, subNodeSizeRange) => {
  const nodes = [];
  const links = [];
  const colors = [
    '#FF6B6B', '#4ECDC4', '#FFD93D', '#6B48FF', '#FF9F40',
    '#00C4FF', '#F06292', '#A2FF86', '#FF5C5C', '#40C4FF',
  ];
  coreTasks.forEach((core, i) => {
    nodes.push({
      id: `core_${i}`,
      name: core,
      size: coreNodeSizeRange[0] + Math.random() * (coreNodeSizeRange[1] - coreNodeSizeRange[0]),
      color: colors[i % colors.length],
      type: 'core',
      progress: Math.random(), // 固定进度
    });
    (subTasksList[i] || []).forEach((sub, j) => {
      const subNodeId = `core_${i}_sub_${j}`;
      nodes.push({
        id: subNodeId,
        name: sub,
        size: subNodeSizeRange[0] + Math.random() * (subNodeSizeRange[1] - subNodeSizeRange[0]),
        color: colors[i % colors.length],
        type: 'sub',
        parentId: `core_${i}`,
        progress: Math.random(), // 固定进度
      });
      links.push({ source: `core_${i}`, target: subNodeId });
    });
  });
  // 随机核心节点间连线
  for (let i = 0; i < coreTasks.length; i++) {
    for (let j = i + 1; j < coreTasks.length; j++) {
      if (Math.random() < 0.3) {
        links.push({ source: `core_${i}`, target: `core_${j}` });
      }
    }
  }
  // 随机球面坐标
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
  const [highlightNodeId, setHighlightNodeId] = useState(null);

  // 优化1：只在 highlightNodeId/data 变化时重建 nodeThreeObject
  useEffect(() => {
    if (!graphRef.current) return;
    graphRef.current.nodeThreeObject((node) => {
      const isHighlight = node.id === highlightNodeId;
      const sphere = new THREE.Mesh(
        new THREE.SphereGeometry(isHighlight ? node.size : node.size / 2),
        new THREE.MeshLambertMaterial({
          color: node.color,
          transparent: true,
          opacity: nodeOpacity,
          emissive: isHighlight ? 0xffff00 : 0x000000,
          emissiveIntensity: isHighlight ? 0.7 : 0,
        })
      );
      if (isHighlight) {
        const glow = new THREE.Mesh(
          new THREE.SphereGeometry(node.size * 1.2),
          new THREE.MeshBasicMaterial({
            color: 0xffff00,
            transparent: true,
            opacity: 0.25,
          })
        );
        sphere.add(glow);
      }
      return sphere;
    });
    // 只更新 nodeThreeObject，不重建整个图
    // eslint-disable-next-line
  }, [highlightNodeId, nodeOpacity, data]);

  useEffect(() => {
    let animationId;
    function autoHighlight() {
      if (!graphRef.current) return;
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
      const camPos = camera.position;
      const camDir = new THREE.Vector3();
      camera.getWorldDirection(camDir);

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

      if (closestNode) {
        setHoveredNodeInfo({ id: closestNode.id, type: closestNode.type });
        setHighlightNodeId(closestNode.id);
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
        // nodeThreeObject 由上面 useEffect 控制
        .linkWidth(1)
        .backgroundColor('#000000')
        .forceEngine('d3')
        .d3Force('charge', forceManyBody().strength(chargeStrength))
        .d3Force('center', forceCenter().strength(0.1))
        .d3Force('link', forceLink().distance(linkDistance))
        .d3Force('radial', forceRadial(100).strength(0.1))
        .warmupTicks(100)
        .onNodeClick((node) => {
          setHighlightNodeId(node.id);
          setHoveredNodeInfo({ id: node.id, type: node.type });
        })
        .onNodeHover((node) => {
          hoveredByMouse.current = !!node;
          if (setHoveredNodeInfo) {
            if (node) {
              setHoveredNodeInfo({ id: node.id, type: node.type });
              setHighlightNodeId(node.id);
            } else {
              setHoveredNodeInfo(null);
              setHighlightNodeId(null);
            }
          }
        });

      const light = new THREE.DirectionalLight(0xffffff, 1);
      light.position.set(0, 10, 10);
      graphRef.current.scene().add(light);

      graphRef.current.cameraPosition({ z: 600 });
    } else {
      graphRef.current.graphData(data);
      graphRef.current.d3Force('charge').strength(chargeStrength);
      graphRef.current.d3Force('link').distance(linkDistance);
      graphRef.current.d3Force('radial').strength(0.1);
      // nodeThreeObject 由上面 useEffect 控制
      graphRef.current.onNodeClick((node) => {
        setHighlightNodeId(node.id);
        setHoveredNodeInfo({ id: node.id, type: node.type });
      });
      graphRef.current.onNodeHover((node) => {
        hoveredByMouse.current = !!node;
        if (setHoveredNodeInfo) {
          if (node) {
            setHoveredNodeInfo({ id: node.id, type: node.type });
            setHighlightNodeId(node.id);
          } else {
            setHoveredNodeInfo(null);
            setHighlightNodeId(null);
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
  const [numCoreNodes, setNumCoreNodes] = useState(15);
  const [numSubNodes, setNumSubNodes] = useState(9);
  const [chargeStrength, setChargeStrength] = useState(-50);
  const [linkDistance, setLinkDistance] = useState(30);
  const [nodeOpacity, setNodeOpacity] = useState(1);
  const [coreNodeSizeRange, setCoreNodeSizeRange] = useState([15, 20]);
  const [subNodeSizeRange, setSubNodeSizeRange] = useState([5, 10]);
  const [data, setData] = useState(null); // 初始为null，不生成本地样例数据
  const [hoveredNodeInfo, setHoveredNodeInfo] = useState(null);
  const [identity, setIdentity] = useState('');
  const [showIdentityModal, setShowIdentityModal] = useState(true);
  const [loading, setLoading] = useState(false);
  const [panelCollapsed, setPanelCollapsed] = useState(true); // 默认合上
  const [useSample, setUseSample] = useState(false);

  const SAMPLE_CORE_TASKS = [
    "编程基础",
    "数据结构与算法",
    "计算机网络",
    "操作系统",
    "数据库系统"
  ];
  const SAMPLE_SUB_TASKS_LIST = [
    [
      "掌握Python基础语法",
      "理解变量与数据类型",
      "掌握条件与循环控制",
      "学习函数定义与调用",
      "掌握模块与库的使用",
      "理解面向对象编程",
      "实践项目开发"
    ],
    [
      "掌握线性表",
      "理解栈与队列",
      "掌握树与图",
      "理解排序算法",
      "掌握查找算法",
      "理解动态规划",
      "实践算法题解"
    ],
    [
      "理解网络分层模型",
      "掌握TCP/IP协议",
      "理解HTTP/HTTPS协议",
      "掌握DNS与DHCP",
      "理解路由与交换",
      "掌握网络安全基础",
      "实践网络配置与调试"
    ],
    [
      "理解进程与线程",
      "掌握内存管理",
      "理解文件系统",
      "掌握并发与同步",
      "理解死锁与饥饿",
      "掌握I/O管理",
      "实践操作系统配置与优化"
    ],
    [
      "理解关系模型与SQL",
      "掌握DDL与DML",
      "理解事务与锁",
      "掌握索引与视图",
      "理解存储过程与触发器",
      "掌握数据库设计",
      "实践数据库管理与优化"
    ]
  ];

  // 首次身份输入提交
  const handleIdentitySubmit = async (e) => {
    e.preventDefault();
    if (identity.trim()) {
      setShowIdentityModal(false);
      setPanelCollapsed(true);
      setLoading(true);
      await handleGenerate(identity);
      setLoading(false);
    }
  };

  // AI生成任务并构建图谱
  const handleGenerate = async (customIdentity) => {
    setLoading(true);
    if (useSample) {
      setData(
        buildGraphDataFromTasks(
          SAMPLE_CORE_TASKS,
          SAMPLE_SUB_TASKS_LIST,
          coreNodeSizeRange,
          subNodeSizeRange
        )
      );
      setLoading(false);
      return;
    }
    const idt = typeof customIdentity === 'string' ? customIdentity : identity;
    try {
      const res = await fetch(
        `http://172.16.76.149:8000/generate_tasks?identity=${encodeURIComponent(idt)}&coreNum=${numCoreNodes}&subNum=${numSubNodes}`
      );
      const result = await res.json();
      if (result && Array.isArray(result.core_tasks) && Array.isArray(result.sub_tasks_list)) {
        setData(
          buildGraphDataFromTasks(
            result.core_tasks,
            result.sub_tasks_list,
            coreNodeSizeRange,
            subNodeSizeRange
          )
        );
      } else {
        setData(null);
      }
    } catch (e) {
      setData(null);
    }
    setLoading(false);
  };

  // 重新生成时也loading
  const handleRegenerate = async () => {
    setPanelCollapsed(true);
    setLoading(true);
    await handleGenerate();
    setLoading(false);
  };

  // 页面首次加载时，如果 useSample 为 true，直接加载样例
  useEffect(() => {
    if (useSample) {
      setData(
        buildGraphDataFromTasks(
          SAMPLE_CORE_TASKS,
          SAMPLE_SUB_TASKS_LIST,
          coreNodeSizeRange,
          subNodeSizeRange
        )
      );
      setShowIdentityModal(false);
      setLoading(false);
    }
    // ...不再自动调用 handleGenerate...
  }, [useSample, coreNodeSizeRange, subNodeSizeRange]);

  // 标签渲染
  const renderTagTabs = () => {
    if (!data || !hoveredNodeInfo) return null;
    const node = data.nodes.find(n => n.id === hoveredNodeInfo.id);
    if (!node) return null;

    let mainColor = '#FFD93D';
    if (node.type === 'core') mainColor = node.color;
    if (node.type === 'sub') {
      const coreId = node.parentId || node.id.split('_sub_')[0];
      const coreNode = data.nodes.find(n => n.id === coreId);
      if (coreNode) mainColor = coreNode.color;
    }

    const tags = [];
    if (node.type === 'core') {
      tags.push({
        label: node.name,
        key: node.id,
        highlight: true,
        level: 0,
        color: mainColor,
        progress: node.progress,
      });
      const subNodes = data.nodes.filter(n => n.type === 'sub' && n.parentId === node.id);
      subNodes.forEach(subNode => {
        tags.push({
          label: subNode.name,
          key: subNode.id,
          highlight: false,
          level: 1,
          color: mainColor,
          progress: subNode.progress,
        });
      });
    } else if (node.type === 'sub') {
      const coreId = node.parentId || node.id.split('_sub_')[0];
      const coreNode = data.nodes.find(n => n.id === coreId);
      if (coreNode) {
        tags.push({
          label: coreNode.name,
          key: coreNode.id,
          highlight: false,
          level: 0,
          color: mainColor,
          progress: coreNode.progress,
        });
      }
      const subNodes = data.nodes.filter(n => n.type === 'sub' && n.parentId === coreId);
      subNodes.forEach(subNode => {
        tags.push({
          label: subNode.name,
          key: subNode.id,
          highlight: subNode.id === node.id,
          level: 1,
          color: mainColor,
          progress: subNode.progress,
        });
      });
    }

    // 修改：主标签靠左，子标签靠右
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end', // 右对齐
        gap: 8, // 缩小间距
        minWidth: 40,
      }}>
        {tags.map((tag) => (
          <div
            key={tag.key}
            style={{
              background: tag.highlight ? '#FFD93D' : tag.color,
              color: tag.highlight ? '#222' : '#fff',
              padding: '4px 10px', // 缩小标签
              borderRadius: '12px 12px 0 12px',
              fontWeight: 'bold',
              fontSize: '0.85rem', // 缩小字体
              boxShadow: tag.highlight ? '0 2px 8px rgba(0,0,0,0.18)' : 'none',
              minWidth: 40,
              textAlign: tag.level === 1 ? 'right' : 'left', // 主标签左对齐，子标签右对齐
              marginLeft: tag.level === 0 ? 0 : 16,
              marginRight: tag.level === 1 ? 0 : 16,
              border: tag.highlight ? '2px solid #FFD93D' : '2px solid transparent',
              transition: 'all 0.2s',
              zIndex: tag.highlight ? 2 : 1,
              position: 'relative',
              overflow: 'hidden',
              alignSelf: tag.level === 1 ? 'flex-end' : 'flex-start', // 子标签右对齐
              opacity: 0.7, // 标签整体透明度
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
                opacity: 0.7, // 进度条底色透明度
              }}
            />
            {/* 进度条前景 */}
            <div
              style={{
                position: 'absolute',
                left: 0,
                bottom: 0,
                height: 6,
                width: `${Math.round((tag.progress || 0) * 100)}%`,
                background: '#22c55e',
                borderRadius: 3,
                transition: 'width 0.3s',
                opacity: 0.7, // 进度条前景透明度
              }}
            />
            <span style={{ position: 'relative', zIndex: 2, opacity: 0.7 }}>{tag.label}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-gray-900 text-white">
      {/* 顶部切换按钮 */}
      <div style={{
        position: 'fixed',
        top: 12,
        left: 24,
        left: panelCollapsed ? 24 : 272, // 跟随侧边栏宽度移动，w-6=24px, w-64=256px+间距
        zIndex: 1001,
        display: 'flex',
        gap: 8, // 缩小间距
      }}>
        <button
          onClick={() => {
            setUseSample(false);
            setShowIdentityModal(true);
            setData(null);
            setIdentity('');
          }}
          style={{
            background: !useSample ? '#FFD93D' : '#333',
            color: !useSample ? '#222' : '#FFD93D',
            border: 'none',
            borderRadius: 6,
            padding: '3px 10px', // 缩小按钮
            fontWeight: 'bold',
            fontSize: 12,        // 缩小字体
            cursor: 'pointer',
            boxShadow: !useSample ? '0 2px 8px #FFD93D44' : 'none',
            opacity: 0.7,        // 按钮透明度
          }}
        >
          身份初始化
        </button>
        <button
          onClick={() => setUseSample(true)}
          style={{
            background: useSample ? '#FFD93D' : '#333',
            color: useSample ? '#222' : '#FFD93D',
            border: 'none',
            borderRadius: 6,
            padding: '3px 10px', // 缩小按钮
            fontWeight: 'bold',
            fontSize: 12,        // 缩小字体
            cursor: 'pointer',
            boxShadow: useSample ? '0 2px 8px #FFD93D44' : 'none',
            opacity: 0.7,        // 按钮透明度
          }}
        >
          浏览样例
        </button>
      </div>
      {/* 身份输入弹窗 */}
      {showIdentityModal && (
        <div style={{
          position: 'fixed', left: 0, top: 0, width: '100vw', height: '100vh',
          background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <form
            onSubmit={handleIdentitySubmit}
            style={{
              background: '#222', padding: 32, borderRadius: 16, minWidth: 320, boxShadow: '0 4px 32px #0008'
            }}
          >
            <h2 style={{ fontSize: 22, fontWeight: 'bold', marginBottom: 24 }}>请输入你的身份</h2>
            <input
              type="text"
              value={identity}
              onChange={e => setIdentity(e.target.value)}
              placeholder="如：工业设计大三"
              style={{
                width: '100%',
                padding: 12,
                borderRadius: 8,
                border: 'none',
                fontSize: 18,
                marginBottom: 24,
                color: '#FDFDFD', // 修改为黄色
                background: '#222', // 建议背景深色
                fontWeight: 'bold', // 可选：让黄色更醒目
              }}
              autoFocus
            />
            <button
              type="submit"
              style={{
                width: '100%', background: '#FFD93D', color: '#222', fontWeight: 'bold',
                border: 'none', borderRadius: 8, padding: 12, fontSize: 18, cursor: 'pointer'
              }}
            >
              开始定制
            </button>
          </form>
        </div>
      )}

      {/* loading 遮罩 */}
      {loading && (
        <div style={{
          position: 'fixed', left: 0, top: 0, width: '100vw', height: '100vh',
          background: 'rgba(0,0,0,0.7)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{
            background: '#222', color: '#FFD93D', fontSize: 22, padding: 32, borderRadius: 16, fontWeight: 'bold'
          }}>
            正在为你定制你的学习计划...
          </div>
        </div>
      )}

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
            left: panelCollapsed ? 24 : 256, // 跟随侧边栏宽度移动，w-6=24px, w-64=256px+间距
            background: '#222',
            color: '#FFD93D',
            border: 'none',
            borderRadius: '0 0 8px 0',
            position: 'absolute',
            top: 42,
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
          <div className="mb-4" style={{ color: '#FFD93D', fontWeight: 'bold' }}>
            当前身份：{identity}
          </div>
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
            onClick={handleRegenerate}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded"
          >
            重新生成图谱
          </button>
        </div>
      </div>
      <div className="flex-1 h-full">
        {data && (
          <KnowledgeGraph
            data={data}
            chargeStrength={chargeStrength}
            linkDistance={linkDistance}
            nodeOpacity={nodeOpacity}
            setHoveredNodeInfo={setHoveredNodeInfo}
          />
        )}
      </div>
    </div>
  );
};

export default App;