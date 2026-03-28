import { useState } from 'react';
import { Button, Card, Flex, Upload, UploadProps, message } from 'antd';
import { DownloadOutlined, InboxOutlined } from '@ant-design/icons';
import ImportResultTable from '../components/ImportResultTable';
import { ProductImportResponse } from '../types/product';
import { productService } from '../services/product';

const buildTemplateContent = () =>
  [
    'code,name,category_level1,category_level2,category_level3,brand,main_unit,sub_units,unit_conversion,barcodes,primary_barcode',
    'P30001,测试商品,食品,休闲零食,坚果,三只松鼠,box,piece,{"piece":12},"6908888888888|6908888888889",6908888888888',
  ].join('\n');

export default function ProductImportPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ProductImportResponse | null>(null);
  const [msgApi, contextHolder] = message.useMessage();

  const uploadProps: UploadProps = {
    accept: '.xlsx,.xls,.csv',
    maxCount: 1,
    beforeUpload: async (file) => {
      try {
        setLoading(true);
        const res = await productService.importProducts(file);
        setResult(res);
        msgApi.success('导入处理完成');
      } catch (error) {
        msgApi.error((error as Error).message);
      } finally {
        setLoading(false);
      }
      return false;
    },
  };

  return (
    <Flex vertical gap={16}>
      {contextHolder}
      <Card title="商品导入">
        <Flex gap={8} style={{ marginBottom: 12 }}>
          <Button
            icon={<DownloadOutlined />}
            onClick={() => {
              const blob = new Blob([buildTemplateContent()], { type: 'text/csv;charset=utf-8' });
              const url = URL.createObjectURL(blob);
              const anchor = document.createElement('a');
              anchor.href = url;
              anchor.download = 'product-import-template.csv';
              anchor.click();
              URL.revokeObjectURL(url);
            }}
          >
            下载模板
          </Button>
        </Flex>

        <Upload.Dragger {...uploadProps} showUploadList={!loading}>
          <p className="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <p className="ant-upload-text">点击或拖拽Excel/CSV到此处上传</p>
          <p className="ant-upload-hint">字段必须与模板完全匹配；支持部分成功导入并返回失败明细。</p>
        </Upload.Dragger>
      </Card>

      {result ? (
        <Card title={`导入结果：成功 ${result.success_count} 条，失败 ${result.failed_count} 条`}>
          <ImportResultTable dataSource={result.details} />
        </Card>
      ) : null}
    </Flex>
  );
}
