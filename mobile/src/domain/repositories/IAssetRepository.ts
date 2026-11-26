import { Asset, AssetContext, AssetInsight, AssetRecord } from '../entities/asset';

export interface IAssetRepository {
  getAllAssets(): Promise<Asset[]>;
  getAssetById(id: number): Promise<Asset>;
  resolveQrToken(qrToken: string): Promise<AssetContext>;
  /** Tem QR quét được (token) hoặc mã in dưới QR nhập tay (code). */
  resolve(query: { token?: string; code?: string }): Promise<AssetContext>;
  getRecord(assetId: number): Promise<AssetRecord>;
  explain(assetId: number, symptom?: string): Promise<AssetInsight>;
}
