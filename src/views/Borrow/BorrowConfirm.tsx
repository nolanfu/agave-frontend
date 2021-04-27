import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { useHistory, useRouteMatch } from "react-router-dom";
import Page from "../../components/Page";
import Button from "../../components/Button";
import {
  AgaveLendingABI__factory,
} from "../../contracts";
import { useAsset } from "../../hooks/asset";
import { useBalance } from "../../hooks/balance";
import { internalAddresses } from "../../utils/contracts/contractAddresses/internalAddresses";
import { useMutation, useQueryClient } from "react-query";
import { ethers } from "ethers";
import { BigNumber } from "@ethersproject/bignumber";

import BorrowOverview from "./BorrowOverview";

const BorrowConfirmWrapper = styled.div`
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
    background: ${(props) => props.theme.color.bgWhite};

    .basic-form {
      max-width: 380px;
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
          color: ${(props) => props.theme.color.pink};
        }

        .basic-form-header-content {
          font-size: 16px;
          text-align: center;
          color: ${(props) => props.theme.color.textPrimary};
        }
      }

      .basic-form-content {
        margin-bottom: 20px;
        width: 100%;

        .form-content-view {
          margin-bottom: 20px;
          width: 100%;
          border: 1px solid ${(props) => props.theme.color.textPrimary};
          padding: 15px;
          border-radius: 2px;
          display: flex;
          justify-content: space-between;

          .content-label {
            font-weight: 400;
            color: ${(props) => props.theme.color.textPrimary};
          }

          .content-value {
            display: flex;
            flex-direction: column;
            align-items: flex-end;
            .token-amount {
              display: flex;
              align-items: center;
              img {
                width: 16px;
                height: 16px;
                margin-right: 5px;
              }

              span {
                font-size: 16px;
              }
            }

            .usd-amount {
              font-size: 10px;
            }
          }
        }

        .form-action-view {
          width: 100%;
          background: white;
          border: 1px solid ${(props) => props.theme.color.textPrimary};

          .form-action-header {
            width: 100%;
            display: flex;

            .form-action-step {
              flex: 1 1 0%;
              display: flex;
              justify-content: center;
              align-items: center;
              background: rgb(241, 241, 243);
              color: ${(props) => props.theme.color.textPrimary};
              font-size: 12px;

              &:not(:last-child) {
                border-right: 1px solid white;
              }

              span {
                font-size: 12px;
                font-weight: 600;
                margin-right: 5px;
              }

              &.active {
                color: white;
                font-size: 12px;
                background: ${(props) => props.theme.color.bgSecondary};
              }

              &.success {
                color: white;
                font-size: 12px;
                background: ${(props) => props.theme.color.green};
              }
            }
          }

          .form-action-body {
            color: rgb(56, 61, 81);
            padding: 15px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            width: 100%;

            .form-action-body-left {
              flex: 1 1 0%;
              margin-right: 15px;
              text-align: left;

              .title {
                font-size: 14px;
                color: ${(props) => props.theme.color.pink};

                &.green {
                  color: ${(props) => props.theme.color.green};
                }
              }

              .desc {
                font-size: 12px;
                color: ${(props) => props.theme.color.textPrimary};
              }
            }
          }
        }
      }

      .basic-form-footer {
        margin: 20px auto 0px;
        display: flex;
        flex-direction: column;
        align-items: center;
      }
    }
  }
`;

const BorrowConfirm: React.FC = () => {
  const queryClient = useQueryClient();
  const history = useHistory();
  const match = useRouteMatch<{
    assetName?: string | undefined;
    amount?: string | undefined;
  }>();

  const assetName = match.params.assetName;
  const [amount, setAmount] = useState<number>(0);
  // TODO: change this 'step' system to nested routes
  const [step, setStep] = useState(1);

  const { asset, assetQueryKey } = useAsset(assetName);
  const { balanceQueryKey } = useBalance(asset);

  useEffect(() => {
    if (match.params && match.params.amount) {
      try {
        const parsed = Number(String(match.params.amount));
        if (amount !== parsed) {
          setAmount(parsed);
        }
      } catch {
        // Don't set the number if the match path isn't one
      }
    }
  }, [match, amount, setAmount]);


  const borrowMutationKey = [...balanceQueryKey, amount] as const;
  const borrowMutation = useMutation<BigNumber | undefined, unknown, BigNumber, unknown>(
    borrowMutationKey,
    async (unitAmount): Promise<BigNumber | undefined> => {
      const [address, library, asset, amount] = borrowMutationKey;
      if (!address || !library || !asset) {
        throw new Error("Account or asset details are not available");
      }
      const lender = AgaveLendingABI__factory.connect(internalAddresses.Lending, library.getSigner());
      const interestRateMode = 2;
      const referralCode = 0;
      const tx = await lender.borrow(asset.contractAddress, amount, interestRateMode, referralCode, address);
      const receipt = await tx.wait();
      return BigNumber.from(receipt.status ? amount : 0);
    },
    {
      onSuccess: async (unitAmountResult, vars, context) => {
        console.log("borrowMutation:onSuccess");
        await Promise.allSettled([
          queryClient.invalidateQueries(borrowMutationKey),
          queryClient.invalidateQueries(balanceQueryKey),
          queryClient.invalidateQueries(assetQueryKey),
        ]);
      },
    }
  );


  return (
    <Page>
      <BorrowConfirmWrapper>
        {asset ? <BorrowOverview asset={asset} /> : <></>}
        <div className="content-wrapper">
          <div className="basic-form">
            <div className="basic-form-header">
              <div className="basic-form-header-title">Borrow Overview</div>
              <div className="basic-form-header-content">
                These are your transaction details. Make sure to check if this
                is correct before submitting.
              </div>
            </div>
            <div className="basic-form-content">
              <div className="form-content-view">
                <div className="content-label">Amount</div>
                {asset ? (
                  <div className="content-value">
                    <div className="token-amount">
                      <img src={asset.img} alt="" />
                      <span>
                        {amount} {asset.name}
                      </span>
                    </div>
                    <div className="usd-amount">
                      $ {asset.asset_price * amount}
                    </div>
                  </div>
                ) : (
                  <></>
                )}
              </div>
              <div className="form-action-view">
                <div className="form-action-header">
                  <div
                    className={`form-action-step ${
                      step === 2 ? "success" : step > 0 ? "active" : ""
                    }`}
                  >
                    <span>1</span> Borrow
                  </div>
                  <div
                    className={`form-action-step ${
                      step === 2 ? "success" : step > 1 ? "active" : ""
                    }`}
                  >
                    <span>2</span> Finished
                  </div>
                </div>
                {step === 1 && (
                  <div className="form-action-body">
                    <div className="form-action-body-left">
                      <div className="title">Borrow</div>
                      <div className="desc">Please submit to borrow</div>
                    </div>
                    <div className="form-action-body-right">
                      <Button
                        variant="secondary"
                        onClick={() => {
                          borrowMutation
                            .mutateAsync(ethers.utils.parseEther(amount.toString()))
                            .then(async (result) => {
                              if (result) {
                                setStep(step + 1)
                              }
                            });
                        }}
                      >
                        Submit
                      </Button>
                    </div>
                  </div>
                )}
                {step === 2 && (
                  <div className="form-action-body">
                    <div className="form-action-body-left">
                      <div className="title green">Success!</div>
                    </div>
                    <div className="form-action-body-right">
                      <Button
                        variant="secondary"
                        onClick={() => history.push("/dashboard")}
                      >
                        Dashboard
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
            {step !== 2 && (
              <div className="basic-form-footer">
                <Button variant="outline" onClick={() => history.goBack()}>
                  Go back
                </Button>
              </div>
            )}
          </div>
        </div>
      </BorrowConfirmWrapper>
    </Page>
  );
};

export default BorrowConfirm;