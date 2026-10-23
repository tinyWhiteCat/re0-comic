import { ArrowDownOutlined, ArrowUpOutlined, DeleteOutlined } from '@ant-design/icons';
import { Button, Card, Flex, Image, Input, InputNumber, Popconfirm, Space, Tag, Typography } from 'antd';
import type { Scene } from '../shared/project';
import { mediaUrl } from './api';

interface Props {
  scene: Scene;
  projectId: string;
  index: number;
  count: number;
  disabled: boolean;
  onChange: (scene: Scene) => void;
  onMove: (direction: number) => void;
  onRemove: () => void;
}
export function SceneCard({ scene, projectId, index, count, disabled, onChange, onMove, onRemove }: Props) {
  return <Card className="scene-card" size="small" data-testid="scene-card">
    <Flex gap={18} align="start" wrap>
      <div className="scene-image">
        <Tag color="green">镜头 {String(index + 1).padStart(2, '0')}</Tag>
        <Image src={mediaUrl(projectId, scene.image)} alt={`第 ${index + 1} 个分镜`} width={120} height={160} style={{ objectFit: 'contain', background: '#f0f2eb', borderRadius: 6 }} />
      </div>
      <Flex vertical gap={12} className="scene-controls">
        <Input.TextArea aria-label={`第 ${index + 1} 镜解说`} value={scene.text} placeholder="写下这一格的解说，文字将作为字幕…" maxLength={500} autoSize={{ minRows: 3, maxRows: 8 }} disabled={disabled} onChange={event => onChange({ ...scene, text: event.target.value })} />
        <Flex justify="space-between" gap={12} wrap align="center">
          <Space wrap>
            <Typography.Text type="secondary">停留</Typography.Text>
            <InputNumber aria-label={`第 ${index + 1} 镜时长`} min={0.5} max={30} step={0.5} value={scene.duration} disabled={disabled} onChange={value => { if (value !== null) onChange({ ...scene, duration: value }); }} style={{ width: 80 }} />
            <Typography.Text type="secondary">秒</Typography.Text>
          </Space>
          <Space>
            <Button aria-label={`上移第 ${index + 1} 镜`} icon={<ArrowUpOutlined />} disabled={disabled || index === 0} onClick={() => onMove(-1)} />
            <Button aria-label={`下移第 ${index + 1} 镜`} icon={<ArrowDownOutlined />} disabled={disabled || index === count - 1} onClick={() => onMove(1)} />
            <Popconfirm title="删除这个分镜？" description="只移除分镜，原始素材仍保留。" onConfirm={onRemove} disabled={disabled} okText="删除" cancelText="取消">
              <Button danger aria-label={`删除第 ${index + 1} 镜`} icon={<DeleteOutlined />} disabled={disabled} />
            </Popconfirm>
          </Space>
        </Flex>
      </Flex>
    </Flex>
  </Card>;
}
