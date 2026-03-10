// 计算机视觉
const COMPUTER_VISION_MAP = new Map([
  [
    'image-classification',
    {
      label: {
        zh: '图像分类',
        en: 'Image Classification',
      },

      domain: '计算机视觉',
      value: 'image-classification',
    },
  ],
  [
    'image-to-text',
    {
      label: {
        zh: '图像生成文本',
        en: 'Image-to-Text',
      },

      domain: '计算机视觉',
      value: 'image-to-text',
    },
  ],
  [
    'object-detection',
    {
      label: {
        zh: '目标检测',
        en: 'Object Detection',
      },

      domain: '计算机视觉',
      value: 'object-detection',
    },
  ],
  [
    'image-segmentation',
    {
      label: {
        zh: '图像分割',
        en: 'Image Segmentation',
      },

      domain: '计算机视觉',
      value: 'image-segmentation',
    },
  ],
  [
    'image-to-image',
    {
      label: {
        zh: '图像生成图像',
        en: 'Image-to-Image',
      },

      domain: '计算机视觉',
      value: 'image-to-image',
    },
  ],
  [
    'mask-generation',
    {
      label: {
        zh: 'mask生成',
        en: 'Mask Generation',
      },

      domain: '计算机视觉',
      value: 'mask-generation',
    },
  ],
  [
    'depth-estimation',
    {
      label: {
        zh: '深度估计',
        en: 'Depth Estimation',
      },
      domain: '计算机视觉',
      value: 'depth-estimation',
    },
  ],
  [
    'zero-shot-object-detection',
    {
      label: {
        zh: '零样本目标检测',
        en: 'Zero-Shot Object Detection',
      },

      domain: '计算机视觉',
      value: 'zero-shot-object-detection',
    },
  ],
  [
    'video-classification',
    {
      label: {
        zh: '视频分类',
        en: 'Video Classification',
      },
      domain: '计算机视觉',
      value: 'video-classification',
    },
  ],
  [
    'zero-shot-image-classification',
    {
      label: {
        zh: '零样本图像分类',
        en: 'Zero-Shot Image Classification',
      },

      domain: '计算机视觉',
      value: 'zero-shot-image-classification',
    },
  ],
  [
    'image-feature-extraction',
    {
      label: {
        zh: '图像特征提取',
        en: 'Image Feature Extraction',
      },

      domain: '计算机视觉',
      value: 'image-feature-extraction',
    },
  ],
  [
    'text-to-3D',
    {
      label: {
        zh: '文本生成3D',
        en: 'Text-to-3D',
      },

      domain: '计算机视觉',
      value: 'text-to-3D',
    },
  ],
  [
    'text-to-image',
    {
      label: {
        zh: '文本生成图像',
        en: 'Text-to-Image',
      },

      domain: '计算机视觉',
      value: 'text-to-image',
    },
  ],
  [
    'image-to-3d',
    {
      label: {
        zh: '图像生成3D',
        en: 'Image-to-3D',
      },

      domain: '计算机视觉',
      value: 'image-to-3d',
    },
  ],
  [
    'text-to-video',
    {
      label: {
        zh: '文本生成视频',
        en: 'Text-to-Video',
      },

      domain: '计算机视觉',
      value: 'text-to-video',
    },
  ],
  [
    'image-to-video',
    {
      label: {
        zh: '图像生成视频',
        en: 'Image-to-Video',
      },

      domain: '计算机视觉',
      value: 'image-to-video',
    },
  ],
  [
    'unconditional-image-generation',
    {
      label: {
        zh: '无条件图像生成',
        en: 'Unconditional Image Generation',
      },

      domain: '计算机视觉',
      value: 'unconditional-image-generation',
    },
  ],
]);

// 自然语言处理
const NATURAL_LANG_MAP = new Map([
  [
    'feature-extraction',
    {
      label: {
        zh: '特征提取',
        en: 'Feature Extraction',
      },

      domain: '自然语言处理',
      value: 'feature-extraction',
    },
  ],
  [
    'text-classification',
    {
      label: {
        zh: '文本分类',
        en: 'Text Classification',
      },

      domain: '自然语言处理',
      value: 'text-classification',
    },
  ],
  [
    'conversation',
    {
      label: {
        zh: '会话',
        en: 'Conversation',
      },
      domain: '自然语言处理',
      value: 'conversation',
    },
  ],
  [
    'text-generation',
    {
      label: {
        zh: '文本生成',
        en: 'Text Generation',
      },

      domain: '自然语言处理',
      value: 'text-generation',
    },
  ],
  [
    'summarization',
    {
      label: {
        zh: '文本摘要',
        en: 'Summarization',
      },

      domain: '自然语言处理',
      value: 'summarization',
    },
  ],
  [
    'translation',
    {
      label: {
        zh: '翻译',
        en: 'Translation',
      },

      domain: '自然语言处理',
      value: 'translation',
    },
  ],
  [
    'table-question-answering',
    {
      label: {
        zh: '表格问答',
        en: 'Table Question Answering',
      },

      domain: '自然语言处理',
      value: 'table-question-answering',
    },
  ],
  [
    'causal-inference',
    {
      label: {
        zh: '因果推理',
        en: 'Causal Inference',
      },

      domain: '自然语言处理',
      value: 'causal-inference',
    },
  ],
  [
    'question-answering',
    {
      label: {
        zh: '问答',
        en: 'Question Answering',
      },

      domain: '自然语言处理',
      value: 'question-answering',
    },
  ],
  [
    'token-classification',
    {
      label: {
        zh: 'token分类',
        en: 'Token Classification',
      },

      domain: '自然语言处理',
      value: 'token-classification',
    },
  ],
  [
    'zero-shot-classification',
    {
      label: {
        zh: '零样本分类',
        en: 'Zero-Shot Classification',
      },

      domain: '自然语言处理',
      value: 'zero-shot-classification',
    },
  ],
  [
    'text2text-generation',
    {
      label: {
        zh: '文本转文本生成',
        en: 'Text2Text Generation',
      },

      domain: '自然语言处理',
      value: 'text2text-generation',
    },
  ],
  [
    'fill-mask',
    {
      label: {
        zh: 'mask填词',
        en: 'Fill-Mask',
      },

      domain: '自然语言处理',
      value: 'fill-mask',
    },
  ],
  [
    'text-retrieval',
    {
      label: {
        zh: '文本提取',
        en: 'Text Retrieval',
      },

      domain: '自然语言处理',
      value: 'text-retrieval',
    },
  ],
  [
    'multiple-choice',
    {
      label: {
        zh: '多选择',
        en: 'Multiple Choice',
      },

      domain: '自然语言处理',
      value: 'multiple-choice',
    },
  ],
  [
    'sentence-similarity',
    {
      label: {
        zh: '文本相似度',
        en: 'Sentence Similarity',
      },

      domain: '自然语言处理',
      value: 'sentence-similarity',
    },
  ],
]);

// 多模态
const MULTI_MODAL_MAP = new Map([
  [
    'visual-question-answering',
    {
      label: {
        zh: '视觉问答',
        en: 'Visual Question Answering',
      },
      domain: '多模态',
      value: 'visual-question-answering',
    },
  ],
]);

// 音频
const AUDIO_MAP = new Map([
  [
    'audio-classification',
    {
      label: {
        zh: '音频分类',
        en: 'Audio Classification',
      },

      domain: '音频',
      value: 'audio-classification',
    },
  ],
  [
    'automatic-speech-recognition',
    {
      label: {
        zh: '自动语音识别',
        en: 'Automatic Speech Recognition',
      },

      domain: '音频',
      value: 'automatic-speech-recognition',
    },
  ],
  [
    'text-to-audio',
    {
      label: {
        zh: '文本生成音频',
        en: 'Text-to-Audio',
      },

      domain: '音频',
      value: 'text-to-audio',
    },
  ],
  [
    'audio-to-audio',
    {
      label: {
        zh: '音频生成音频',
        en: 'Audio-to-Audio',
      },

      domain: '音频',
      value: 'audio-to-audio',
    },
  ],
  [
    'text-to-speech',
    {
      label: {
        zh: '文本生成语音',
        en: 'Text-to-Speech',
      },

      domain: '音频',
      value: 'text-to-speech',
    },
  ],
  [
    'voice-activity-detection',
    {
      label: {
        zh: '语音激活检测',
        en: 'Voice Activity Detection',
      },

      domain: '音频',
      value: 'voice-activity-detection',
    },
  ],
]);

// 其他
const OTHER_MAP = new Map([
  [
    'tabular-classification',
    {
      label: {
        zh: '表格分类',
        en: 'Tabular Classification',
      },

      domain: '其他',
      value: 'tabular-classification',
    },
  ],
  [
    'tabular-regression',
    {
      label: {
        zh: '表格回归',
        en: 'Tabular Regression',
      },

      domain: '其他',
      value: 'tabular-regression',
    },
  ],
  [
    'tabular-to-text',
    {
      label: {
        zh: '表格生成文本',
        en: 'Tabular-to-Text',
      },

      domain: '其他',
      value: 'tabular-to-text',
    },
  ],
  [
    'time-series-forecasting',
    {
      label: {
        zh: '时间序列预测',
        en: 'Time Series Forecasting',
      },

      domain: '其他',
      value: 'time-series-forecasting',
    },
  ],
  [
    'reinforcement-learning',
    {
      label: {
        zh: '强化学习',
        en: 'Reinforcement Learning',
      },

      domain: '其他',
      value: 'reinforcement-learning',
    },
  ],
  [
    'graph-ml',
    {
      label: {
        zh: '图机器学习',
        en: 'Graph Machine Learning',
      },

      domain: '其他',
      value: 'graph-ml',
    },
  ],
  [
    'robotics',
    {
      label: {
        zh: '机器人',
        en: 'Robotics',
      },

      domain: '其他',
      value: 'robotics',
    },
  ],
]);

export const DATASET_TASKS = [
  ...Array.from(COMPUTER_VISION_MAP.values()).map(item => item.value),
  ...Array.from(NATURAL_LANG_MAP.values()).map(item => item.value),
  ...Array.from(MULTI_MODAL_MAP.values()).map(item => item.value),
  ...Array.from(AUDIO_MAP.values()).map(item => item.value),
  ...Array.from(OTHER_MAP.values()).map(item => item.value),
];
