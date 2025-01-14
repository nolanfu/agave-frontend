import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { useHistory, useRouteMatch, withRouter } from "react-router-dom";
import { store as NotificationManager } from "react-notifications-component";
import Page from "../../components/Page";
import Button from "../../components/Button";
import { IMarketData, marketData } from "../../utils/constants";
import DepositOverview from './DepositOverview';
import { useWeb3React } from "@web3-react/core";
import { useSelector } from 'react-redux';
import {
  AgaveLendingABI__factory,
  Erc20abi,
  Erc20abi__factory,
} from "../../contracts";
import { useQuery, useMutation, useQueryClient } from "react-query";
import { BigNumber, BigNumberish } from "@ethersproject/bignumber";
import { internalAddresses } from "../../utils/contracts/contractAddresses/internalAddresses";
import { ethers } from "ethers";
import { Web3Provider } from '@ethersproject/providers';

const DepositDetailWrapper = styled.div`
  height: 100%;
  display: flex;
  flex-direction: column;
  .content-wrapper {
    padding: 15px 0px;
    margin: 20px 0px 10px;
    flex-direction: column;
    display: flex;
    align-items: center;
    justify-content: center;
    flex: 1 1 0%;
    background: ${props => props.theme.color.bgWhite};
    .basic-form {
      max-width: 500px;
      margin: 0px auto;
      .basic-form-header {
        margin-bottom: 30px;
        text-align: center;
        width: 100%;
        overflow: hidden;
        .basic-form-header-title {
          width: 100%;
          font-size: 16px;
          font-weight: bold;
          text-align: center;
          margin-bottom: 10px;
          color: ${props => props.theme.color.pink};
        }
        .basic-form-header-content {
          font-size: 16px;
          text-align: center;
          color: ${props => props.theme.color.textPrimary};
        }
      }
      .basic-form-content {
        width: 335px;
        padding-bottom: 25px;
        margin: 0px auto;
        .basic-form-content-top {
          display: flex;
          flex-flow: row wrap;
          align-items: flex-start;
          justify-content: space-between;
          font-size: 14px;
          margin-bottom: 5px;
          color: ${props => props.theme.color.textPrimary};
          .basic-form-content-top-label {
            color: ${props => props.theme.color.textPrimary};
            font-weight: 400;
            font-size: 14px;
          }
          .basic-form-content-top-value {
            display: flex;
            align-items: center;
            justify-content: flex-end;
            flex: 1 1 0%;
            color: ${props => props.theme.color.textPrimary};
            span {
              font-weight: 600;
              margin-right: 5px;
            }
          }
        }
        .basic-form-content-body {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0px 15px;
          border-radius: 2px;
          transition: all 0.2s ease 0s;
          border: 1px solid ${props => props.theme.color.bgSecondary};
          .image-section {
            padding-right: 10px;
          }
          .input-section {
            width: 100%;
            input {
              border: none;
              background: transparent;
              font-family: roboto-font, sans-serif;
              transition: all 0.2s ease 0s;
              font-size: 16px;
              width: 100%;
              padding: 13px 5px 13px 0px;
              appearance: none;
              box-shadow: none;
              outline: none;
              opacity: 1;
              color: ${props => props.theme.color.textPrimary};
              &::-webkit-inner-spin-button {
                -webkit-appearance: none;
                margin: 0;
              }
            }
          }
          .max-section {
            font-weight: 600;
            font-size: 14px;
            cursor: pointer;
            color: ${props => props.theme.color.pink};
            transition: all 0.2s ease 0s;
            &:hover {
              opacity: 0.7;
            }
          }
        }
      }
      .basic-form-footer {
        margin-top: 50px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: space-between;
        height: 80px;
      }
    }
  }
`;



const DepositDetail: React.FC<{}> = ({}) => {
  const match = useRouteMatch<{
    assetName: string | undefined,
  }>();
  const assetName = match.params.assetName;
  
  const history = useHistory();
  const { account: address, library } = useWeb3React<Web3Provider>();
  //const [asset, setAsset] = useState<IMarketData>();
  const [amountStr, setAmountStr] = useState<string>("");
  
  const assetQueryKey = [assetName] as const;
  const {
    data: asset,
    error: assetFetchError,
    isLoading: isAssetLoading,
  } = useQuery(
    assetQueryKey,
    async (ctx): Promise<IMarketData | undefined> => {
      const [assetName]: typeof assetQueryKey = ctx.queryKey;
      if (!assetName) {
        return undefined;
      }

      const asset = marketData.find((a) => a.name == match.params.assetName);
      if (!asset) {
        console.warn(`Asset ${match.params.assetName} not found`);
        return;
      }
      console.log("Asset:");
      console.log(asset);
      return asset;
    },
    {
      initialData: undefined,
    }
  );
  const balanceQueryKey = [address, library, asset] as const;
  const {
    data: balance,
    error: balanceFetchError,
    isLoading: isBalanceLoading,
  } = useQuery(
    balanceQueryKey,
    async (ctx) => {
      const [address, library, asset]: typeof balanceQueryKey = ctx.queryKey;
      if (!address || !library || !asset) {
        return undefined;
      }
      const contract = Erc20abi__factory.connect(
        asset.contractAddress,
        library.getSigner()
      );
      const tokenBalance = await contract.balanceOf(address);
      console.log("Token balance:");
      console.log(ethers.utils.formatEther(tokenBalance));
      asset.wallet_balance = Number(ethers.utils.formatEther(tokenBalance));
      return tokenBalance;
    },
    {
      initialData: undefined,
    }
  );

  const handleInputChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    setAmountStr(e.target.value);
  };

  const handleDeposit: React.MouseEventHandler<HTMLDivElement> = () => {
    if (!asset) {
      NotificationManager.addNotification({
        type: "danger",
        container: "top-right",
        message: "Please input the correct amount",
      });
      return;
    }
    if (!amountStr || isNaN(Number(amountStr))) {
      NotificationManager.addNotification({
        type: "danger",
        container: "center",
        message: "Please input a valid asset amount",
      });
      return;
    }
    history.push(`/deposit/confirm/${asset.name}/${amountStr}`);
  };

  useEffect(() => { (async () => {
    console.log(`${library} : ${address} : ${match.params}`);
    if (library && address && match.params && match.params.assetName) {
      /*
      const contract = AgaveLendingABI__factory.connect(internalAddresses.Lending, library.getSigner());

      let accountData;
      try {
        accountData = await contract.getUserAccountData(address);   
        console.log(balance);   
      } catch (e) {
        // revert?
        console.log("Revert encountered attempting to read user account data for addr " + address);
        console.log(e);
        return;
      }
      const assetBaseWithImage = marketData.find((data) => {
        return data.name === match.params.assetName;
      });
      if (!assetBaseWithImage) {
        console.log("Asset with base image not found for name " + match.params.assetName);
        return;
      }
      const availableEth = ethers.utils.parseEther(ethers.utils.formatEther(accountData.availableBorrowsETH));
      const assetInfo = {
        ...assetBaseWithImage,
        wallet_balance: availableEth.toNumber(),
        name: match.params.assetName,
      }
      setAsset(assetInfo);
      */
    }
  })(); }, [match, asset, balance]);
  
  if (!asset) {
    return <>No asset found with details </>;
  }

  if (!address || !library) {
    return <>No account loaded</>;
  }

  return (
    <Page>
      <DepositDetailWrapper>
        <DepositOverview asset={asset} />
        <div className="content-wrapper">
          <div className="basic-form">
            <div className="basic-form-header">
              <div className="basic-form-header-title">
                How much would you like to deposit?
              </div>
              <div className="basic-form-header-content">
                Please enter an amount you would like to deposit. The maximum amount you can deposit is shown below.
              </div>
            </div>
            <div className="basic-form-content">
              <div className="basic-form-content-top">
                <div className="basic-form-content-top-label">
                  Available to deposit
                </div>
                <div className="basic-form-content-top-value">
                  <span>{asset.wallet_balance}</span> {asset.name}
                </div>
              </div>
              <div className="basic-form-content-body">
                <div className="image-section">
                  <img src={asset.img} alt="" width={30} height={30} />
                </div>
                <div className="input-section">
                  <input
                    type="number"
                    placeholder="Amount"
                    step="any"
                    min="0"
                    value={amountStr}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="max-section" onClick={() => setAmountStr(String(asset.wallet_balance))}>
                  Max
                </div>
              </div>
            </div>
            <div className="basic-form-footer">
              <Button variant="secondary" onClick={handleDeposit}>Continue</Button>
              <Button variant="outline" onClick={() => history.goBack()}>Go back</Button>
            </div>
          </div>
        </div>
      </DepositDetailWrapper>
    </Page>
  );
}

export default withRouter(DepositDetail);