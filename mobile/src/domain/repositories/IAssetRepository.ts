import { Asset, AssetContext } from '../entities/asset';

export interface IAssetRepository {
  getAllAssets(): Promise<Asset[]>;
  getAssetById(id: number): Promise<Asset>;
  resolveQrToken(qrToken: string): Promise<AssetContext>;
}
