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
      class: 'tag-purple1',
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
      class: 'tag-purple1',
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
      class: 'tag-purple1',
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
      class: 'tag-purple1',
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
      class: 'tag-purple1',
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
      class: 'tag-purple1',
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
      class: 'tag-purple1',
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
      class: 'tag-purple1',
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
      class: 'tag-purple1',
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
      class: 'tag-purple1',
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
      class: 'tag-purple1',
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
      class: 'tag-purple1',
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
      class: 'tag-purple1',
      domain: '自然语言处理',
      value: 'fill-mask',
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
      class: 'tag-blue1',
      domain: '多模态',
      value: 'visual-question-answering',
    },
  ],
  [
    'document-question-answering',
    {
      label: {
        zh: '文档问答',
        en: 'Document Question Answering',
      },
      class: 'tag-blue1',
      domain: '多模态',
      value: 'document-question-answering',
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
      class: 'tag-pink1',
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
      class: 'tag-pink1',
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
      class: 'tag-pink1',
      domain: '音频',
      value: 'text-to-audio',
    },
  ],
]);

export const MODEL_TASKS = [
  ...Array.from(COMPUTER_VISION_MAP.values()).map(item => item.value),
  ...Array.from(NATURAL_LANG_MAP.values()).map(item => item.value),
  ...Array.from(MULTI_MODAL_MAP.values()).map(item => item.value),
  ...Array.from(AUDIO_MAP.values()).map(item => item.value),
];
