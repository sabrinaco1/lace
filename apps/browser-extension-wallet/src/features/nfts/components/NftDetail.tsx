import { useAssetInfo, useRedirection, useWalletAvatar } from '@hooks';
import { walletRoutePaths } from '@routes';
import React, { useCallback, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import styles from './Nfts.module.scss';
import { Button, Drawer, DrawerNavigation, toast, useObservable } from '@lace/common';
import { useWalletStore } from '@src/stores';
import { nftDetailSelector, nftNameSelector } from '@src/views/browser-view/features/nfts/selectors';
import { NftDetail as NftDetailView } from '@lace/core';
import { Wallet } from '@lace/cardano';
import { useTranslation } from 'react-i18next';
import { SendFlowTriggerPoints, useOutputInitialState } from '@src/views/browser-view/features/send-transaction';
import { APP_MODE_POPUP, DEFAULT_WALLET_BALANCE, SEND_NFT_DEFAULT_AMOUNT } from '@src/utils/constants';
import { PostHogAction } from '@providers/AnalyticsProvider/analyticsTracker';
import { useAnalyticsContext, useExternalLinkOpener } from '@providers';
import { buttonIds } from '@hooks/useEnterKeyPress';
import { withNftsFoldersContext } from '../context';
import { usePostHogClientContext } from '@providers/PostHogClientProvider';
import { NFTPrintLabDialog } from '@src/views/browser-view/features/nfts/components/NFTPrintLabDialog';

export const NFTPRINTLAB_URL = process.env.NFTPRINTLAB_URL;

export const NftDetail = withNftsFoldersContext((): React.ReactElement => {
  const [nftPrintLabDialogOpen, setNftPrintLabDialogOpen] = useState(false);
  const {
    inMemoryWallet,
    walletUI: { appMode },
    currentChain
  } = useWalletStore();
  const { t } = useTranslation();
  const analytics = useAnalyticsContext();
  const posthog = usePostHogClientContext();
  const { setAvatar } = useWalletAvatar();

  const redirectToNfts = useRedirection(walletRoutePaths.nfts);
  const redirectToSend = useRedirection<{ params: { id?: string } }>(walletRoutePaths.send);
  const { id } = useParams<{ id: string }>();
  const assetsInfo = useAssetInfo();
  const setSendInitialState = useOutputInitialState();
  const openExternalLink = useExternalLinkOpener();

  const assetId = Wallet.Cardano.AssetId(id);
  const assetInfo = assetsInfo?.get(assetId);
  const assetsBalance = useObservable(inMemoryWallet.balance.utxo.total$, DEFAULT_WALLET_BALANCE.utxo.total$);
  const bigintBalance = assetsBalance?.assets?.get(assetId) || BigInt(1);

  const amount = useMemo(() => Wallet.util.calculateAssetBalance(bigintBalance, assetInfo), [assetInfo, bigintBalance]);

  const handleOpenSend = () => {
    // eslint-disable-next-line camelcase
    analytics.sendEventToPostHog(PostHogAction.SendClick, { trigger_point: SendFlowTriggerPoints.NFTS });
    setSendInitialState(id, SEND_NFT_DEFAULT_AMOUNT);
    redirectToSend({ params: { id } });
  };

  const handleSetAsAvatar = (image: string) => {
    setAvatar(image);
    toast.notify({ text: t('core.nftDetail.avatarUpdated') });
    analytics.sendEventToPostHog(PostHogAction.NFTDetailSetAsAvatarClick);
  };

  const handleOpenTabNFTPrintLab = useCallback(() => {
    analytics.sendEventToPostHog(PostHogAction.NFTDetailPrintClick);
    setNftPrintLabDialogOpen(true);
  }, [analytics]);

  const isMainnet = currentChain?.networkMagic === Wallet.Cardano.NetworkMagics.Mainnet;
  const canPrintNft = isMainnet && posthog?.isFeatureFlagEnabled('nftprintlab');

  return (
    <>
      <Drawer
        popupView
        className={styles.drawer}
        visible
        navigation={<DrawerNavigation onArrowIconClick={() => redirectToNfts()} />}
        dataTestId="nft-details-drawer"
        footer={
          <div className={styles.footer}>
            <Button id={buttonIds.nftDetailsBtnId} className={styles.sendBtn} onClick={handleOpenSend}>
              {t('core.nftDetail.sendNFT')}
            </Button>
          </div>
        }
      >
        {assetInfo && (
          <NftDetailView
            {...nftDetailSelector(assetInfo)}
            isPopup={appMode === APP_MODE_POPUP}
            amount={amount}
            title={<h2 className={styles.secondaryTitle}>{nftNameSelector(assetInfo)}</h2>}
            onSetAsAvatar={handleSetAsAvatar}
            onPrintNft={canPrintNft ? handleOpenTabNFTPrintLab : undefined}
          />
        )}
      </Drawer>
      <NFTPrintLabDialog
        onCancel={() => {
          analytics.sendEventToPostHog(PostHogAction.NFTPrintLabDisclaimerCancelClick);
          setNftPrintLabDialogOpen(false);
        }}
        open={nftPrintLabDialogOpen}
        onConfirm={() => {
          analytics.sendEventToPostHog(PostHogAction.NFTPrintLabDisclaimerConfirmClick);
          openExternalLink(NFTPRINTLAB_URL);
          setNftPrintLabDialogOpen(false);
        }}
      />
    </>
  );
});
