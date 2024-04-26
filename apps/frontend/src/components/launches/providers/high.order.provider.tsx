'use client';

import React, {
  FC,
  Fragment,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Button } from '@gitroom/react/form/button';
import { deleteDialog } from '@gitroom/react/helpers/delete.dialog';
import MDEditor, { commands } from '@uiw/react-md-editor';
import { useHideTopEditor } from '@gitroom/frontend/components/launches/helpers/use.hide.top.editor';
import { useValues } from '@gitroom/frontend/components/launches/helpers/use.values';
import { FormProvider } from 'react-hook-form';
import { useMoveToIntegrationListener } from '@gitroom/frontend/components/launches/helpers/use.move.to.integration';
import { useExistingData } from '@gitroom/frontend/components/launches/helpers/use.existing.data';
import {
  IntegrationContext,
  useIntegration,
} from '@gitroom/frontend/components/launches/helpers/use.integration';
import { MultiMediaComponent } from '@gitroom/frontend/components/media/media.component';
import { createPortal } from 'react-dom';
import clsx from 'clsx';
import { newImage } from '@gitroom/frontend/components/launches/helpers/new.image.component';
import { postSelector } from '@gitroom/frontend/components/post-url-selector/post.url.selector';
import { UpDownArrow } from '@gitroom/frontend/components/launches/up.down.arrow';
import { arrayMoveImmutable } from 'array-move';
import { linkedinCompany } from '@gitroom/frontend/components/launches/helpers/linkedin.component';

// Simple component to change back to settings on after changing tab
export const SetTab: FC<{ changeTab: () => void }> = (props) => {
  useEffect(() => {
    return () => {
      setTimeout(() => {
        props.changeTab();
      }, 500);
    };
  }, []);
  return null;
};

// This is a simple function that if we edit in place, we hide the editor on top
export const EditorWrapper: FC<{ children: ReactNode }> = ({ children }) => {
  const showHide = useHideTopEditor();
  const [showEditor, setShowEditor] = useState(false);

  useEffect(() => {
    setShowEditor(true);
    showHide.hide();
    return () => {
      showHide.show();
      setShowEditor(false);
    };
  }, []);

  if (!showEditor) {
    return null;
  }

  return children;
};

export const withProvider = (
  SettingsComponent: FC | null,
  PreviewComponent: FC,
  dto?: any
) => {
  return (props: {
    identifier: string;
    id: string;
    value: Array<{
      content: string;
      id?: string;
      image?: Array<{ path: string; id: string }>;
    }>;
    show: boolean;
  }) => {
    const existingData = useExistingData();
    const { integration, date } = useIntegration();
    const [editInPlace, setEditInPlace] = useState(!!existingData.integration);
    const [InPlaceValue, setInPlaceValue] = useState<
      Array<{
        id?: string;
        content: string;
        image?: Array<{ id: string; path: string }>;
      }>
    >(
      // @ts-ignore
      existingData.integration
        ? existingData.posts.map((p) => ({
            id: p.id,
            content: p.content,
            image: p.image,
          }))
        : [{ content: '' }]
    );
    const [showTab, setShowTab] = useState(0);

    const Component = useMemo(() => {
      return SettingsComponent ? SettingsComponent : () => <></>;
    }, [SettingsComponent]);

    // in case there is an error on submit, we change to the settings tab for the specific provider
    useMoveToIntegrationListener([props.id], true, (identifier) => {
      if (identifier === props.id) {
        setShowTab(2);
      }
    });

    // this is a smart function, it updates the global value without updating the states (too heavy) and set the settings validation
    const form = useValues(
      existingData.settings,
      props.id,
      props.identifier,
      editInPlace ? InPlaceValue : props.value,
      dto
    );

    // change editor value
    const changeValue = useCallback(
      (index: number) => (newValue: string) => {
        return setInPlaceValue((prev) => {
          prev[index].content = newValue;
          return [...prev];
        });
      },
      [InPlaceValue]
    );

    const changeImage = useCallback(
      (index: number) =>
        (newValue: {
          target: { name: string; value?: Array<{ id: string; path: string }> };
        }) => {
          return setInPlaceValue((prev) => {
            prev[index].image = newValue.target.value;
            return [...prev];
          });
        },
      [InPlaceValue]
    );

    // add another local editor
    const addValue = useCallback(
      (index: number) => () => {
        setInPlaceValue((prev) => {
          return prev.reduce((acc, p, i) => {
            acc.push(p);
            if (i === index) {
              acc.push({ content: '' });
            }

            return acc;
          }, [] as Array<{ content: string }>);
        });
      },
      []
    );

    const changePosition = useCallback(
      (index: number) => (type: 'up' | 'down') => {
        if (type === 'up' && index !== 0) {
          setInPlaceValue((prev) => {
            return arrayMoveImmutable(prev, index, index - 1);
          });
        } else if (type === 'down') {
          setInPlaceValue((prev) => {
            return arrayMoveImmutable(prev, index, index + 1);
          });
        }
      },
      []
    );

    // Delete post
    const deletePost = useCallback(
      (index: number) => async () => {
        if (
          !(await deleteDialog(
            'Are you sure you want to delete this post?',
            'Yes, delete it!'
          ))
        ) {
          return;
        }
        setInPlaceValue((prev) => {
          prev.splice(index, 1);
          return [...prev];
        });
      },
      [InPlaceValue]
    );

    // This is a function if we want to switch from the global editor to edit in place
    const changeToEditor = useCallback(async () => {
      if (
        !(await deleteDialog(
          !editInPlace
            ? 'Are you sure you want to edit only this?'
            : 'Are you sure you want to revert it back to global editing?',
          'Yes, edit in place!'
        ))
      ) {
        return false;
      }

      setEditInPlace(!editInPlace);
      setInPlaceValue(
        editInPlace
          ? [{ content: '' }]
          : props.value.map((p) => ({
              id: p.id,
              content: p.content,
              image: p.image,
            }))
      );
    }, [props.value, editInPlace]);

    // this is a trick to prevent the data from being deleted, yet we don't render the elements
    if (!props.show) {
      return null;
    }

    return (
      <FormProvider {...form}>
        <SetTab changeTab={() => setShowTab(0)} />
        <div className="mt-[15px] w-full flex flex-col flex-1">
          <div className="flex gap-[4px]">
            <div className="flex-1 flex">
              <Button
                className="rounded-[4px] flex-1 overflow-hidden whitespace-nowrap"
                secondary={showTab !== 0}
                onClick={() => setShowTab(0)}
              >
                Preview
              </Button>
            </div>
            {!!SettingsComponent && (
              <div className="flex-1 flex">
                <Button
                  className={clsx(
                    'flex-1 overflow-hidden whitespace-nowrap',
                    showTab === 2 && 'rounded-[4px]'
                  )}
                  secondary={showTab !== 2}
                  onClick={() => setShowTab(2)}
                >
                  Settings
                </Button>
              </div>
            )}
            <div className="flex-1 flex">
              <Button
                className="rounded-[4px] flex-1 !bg-red-700 overflow-hidden whitespace-nowrap"
                secondary={showTab !== 1}
                onClick={changeToEditor}
              >
                {editInPlace ? 'Edit globally' : 'Edit only this'}
              </Button>
            </div>
          </div>
          {editInPlace &&
            createPortal(
              <EditorWrapper>
                <div className="flex flex-col gap-[20px]">
                  {!existingData?.integration && (
                    <div className="bg-red-800">
                      This will edit only this provider
                    </div>
                  )}
                  {InPlaceValue.map((val, index) => (
                    <Fragment key={`edit_inner_${index}`}>
                      <div>
                        <div className="flex gap-[4px]">
                          <div className="flex-1 text-white editor">
                            <MDEditor
                              height={InPlaceValue.length > 1 ? 200 : 250}
                              value={val.content}
                              commands={[
                                ...commands
                                  .getCommands()
                                  .filter((f) => f.name !== 'image'),
                                newImage,
                                postSelector(date),
                                ...linkedinCompany(integration?.identifier!, integration?.id!),
                              ]}
                              preview="edit"
                              // @ts-ignore
                              onChange={changeValue(index)}
                            />
                            {(!val.content || val.content.length < 6) && (
                              <div className="my-[5px] text-[#F97066] text-[12px] font-[500]">
                                The post should be at least 6 characters long
                              </div>
                            )}
                            <div className="flex">
                              <div className="flex-1">
                                <MultiMediaComponent
                                  label="Attachments"
                                  description=""
                                  name="image"
                                  value={val.image}
                                  onChange={changeImage(index)}
                                />
                              </div>
                              <div className="flex bg-[#121b2c] rounded-br-[8px] text-[#F97066]">
                                {InPlaceValue.length > 1 && (
                                  <div
                                    className="flex cursor-pointer gap-[4px] justify-center items-center flex-1"
                                    onClick={deletePost(index)}
                                  >
                                    <div>
                                      <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        width="14"
                                        height="14"
                                        viewBox="0 0 14 14"
                                        fill="currentColor"
                                      >
                                        <path
                                          d="M11.8125 2.625H9.625V2.1875C9.625 1.8394 9.48672 1.50556 9.24058 1.25942C8.99444 1.01328 8.6606 0.875 8.3125 0.875H5.6875C5.3394 0.875 5.00556 1.01328 4.75942 1.25942C4.51328 1.50556 4.375 1.8394 4.375 2.1875V2.625H2.1875C2.07147 2.625 1.96019 2.67109 1.87814 2.75314C1.79609 2.83519 1.75 2.94647 1.75 3.0625C1.75 3.17853 1.79609 3.28981 1.87814 3.37186C1.96019 3.45391 2.07147 3.5 2.1875 3.5H2.625V11.375C2.625 11.6071 2.71719 11.8296 2.88128 11.9937C3.04538 12.1578 3.26794 12.25 3.5 12.25H10.5C10.7321 12.25 10.9546 12.1578 11.1187 11.9937C11.2828 11.8296 11.375 11.6071 11.375 11.375V3.5H11.8125C11.9285 3.5 12.0398 3.45391 12.1219 3.37186C12.2039 3.28981 12.25 3.17853 12.25 3.0625C12.25 2.94647 12.2039 2.83519 12.1219 2.75314C12.0398 2.67109 11.9285 2.625 11.8125 2.625ZM5.25 2.1875C5.25 2.07147 5.29609 1.96019 5.37814 1.87814C5.46019 1.79609 5.57147 1.75 5.6875 1.75H8.3125C8.42853 1.75 8.53981 1.79609 8.62186 1.87814C8.70391 1.96019 8.75 2.07147 8.75 2.1875V2.625H5.25V2.1875ZM10.5 11.375H3.5V3.5H10.5V11.375ZM6.125 5.6875V9.1875C6.125 9.30353 6.07891 9.41481 5.99686 9.49686C5.91481 9.57891 5.80353 9.625 5.6875 9.625C5.57147 9.625 5.46019 9.57891 5.37814 9.49686C5.29609 9.41481 5.25 9.30353 5.25 9.1875V5.6875C5.25 5.57147 5.29609 5.46019 5.37814 5.37814C5.46019 5.29609 5.57147 5.25 5.6875 5.25C5.80353 5.25 5.91481 5.29609 5.99686 5.37814C6.07891 5.46019 6.125 5.57147 6.125 5.6875ZM8.75 5.6875V9.1875C8.75 9.30353 8.70391 9.41481 8.62186 9.49686C8.53981 9.57891 8.42853 9.625 8.3125 9.625C8.19647 9.625 8.08519 9.57891 8.00314 9.49686C7.92109 9.41481 7.875 9.30353 7.875 9.1875V5.6875C7.875 5.57147 7.92109 5.46019 8.00314 5.37814C8.08519 5.29609 8.19647 5.25 8.3125 5.25C8.42853 5.25 8.53981 5.29609 8.62186 5.37814C8.70391 5.46019 8.75 5.57147 8.75 5.6875Z"
                                          fill="#F97066"
                                        />
                                      </svg>
                                    </div>
                                    <div className="text-[12px] font-[500] pr-[10px]">
                                      Delete Post
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          <div>
                            <UpDownArrow
                              isUp={index !== 0}
                              isDown={
                                InPlaceValue.length !== 0 &&
                                InPlaceValue.length !== index + 1
                              }
                              onChange={changePosition(index)}
                            />
                          </div>
                        </div>
                      </div>
                      <div>
                        <Button
                          onClick={addValue(index)}
                          className="!h-[24px] rounded-[3px] flex gap-[4px] w-[102px] text-[12px] font-[500]"
                        >
                          <div>
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="14"
                              height="14"
                              viewBox="0 0 14 14"
                              fill="none"
                            >
                              <path
                                d="M7 1.3125C5.87512 1.3125 4.7755 1.64607 3.8402 2.27102C2.90489 2.89597 2.17591 3.78423 1.74544 4.82349C1.31496 5.86274 1.20233 7.00631 1.42179 8.10958C1.64124 9.21284 2.18292 10.2263 2.97833 11.0217C3.77374 11.8171 4.78716 12.3588 5.89043 12.5782C6.99369 12.7977 8.13726 12.685 9.17651 12.2546C10.2158 11.8241 11.104 11.0951 11.729 10.1598C12.3539 9.2245 12.6875 8.12488 12.6875 7C12.6859 5.49207 12.0862 4.04636 11.0199 2.98009C9.95365 1.91382 8.50793 1.31409 7 1.3125ZM7 11.8125C6.04818 11.8125 5.11773 11.5303 4.32632 11.0014C3.53491 10.4726 2.91808 9.72103 2.55383 8.84166C2.18959 7.96229 2.09428 6.99466 2.27997 6.06113C2.46566 5.12759 2.92401 4.27009 3.59705 3.59705C4.27009 2.92401 5.1276 2.46566 6.06113 2.27997C6.99466 2.09428 7.9623 2.18958 8.84167 2.55383C9.72104 2.91808 10.4726 3.53491 11.0015 4.32632C11.5303 5.11773 11.8125 6.04818 11.8125 7C11.8111 8.27591 11.3036 9.49915 10.4014 10.4014C9.49915 11.3036 8.27591 11.8111 7 11.8125ZM9.625 7C9.625 7.11603 9.57891 7.22731 9.49686 7.30936C9.41481 7.39141 9.30353 7.4375 9.1875 7.4375H7.4375V9.1875C7.4375 9.30353 7.39141 9.41481 7.30936 9.49686C7.22731 9.57891 7.11603 9.625 7 9.625C6.88397 9.625 6.77269 9.57891 6.69064 9.49686C6.6086 9.41481 6.5625 9.30353 6.5625 9.1875V7.4375H4.8125C4.69647 7.4375 4.58519 7.39141 4.50314 7.30936C4.4211 7.22731 4.375 7.11603 4.375 7C4.375 6.88397 4.4211 6.77269 4.50314 6.69064C4.58519 6.60859 4.69647 6.5625 4.8125 6.5625H6.5625V4.8125C6.5625 4.69647 6.6086 4.58519 6.69064 4.50314C6.77269 4.42109 6.88397 4.375 7 4.375C7.11603 4.375 7.22731 4.42109 7.30936 4.50314C7.39141 4.58519 7.4375 4.69647 7.4375 4.8125V6.5625H9.1875C9.30353 6.5625 9.41481 6.60859 9.49686 6.69064C9.57891 6.77269 9.625 6.88397 9.625 7Z"
                                fill="white"
                              />
                            </svg>
                          </div>
                          <div>Add post</div>
                        </Button>
                      </div>
                    </Fragment>
                  ))}
                </div>
              </EditorWrapper>,
              document.querySelector('#renderEditor')!
            )}
          {showTab === 2 && (
            <div className="mt-[20px]">
              <Component />
            </div>
          )}
          {showTab === 0 && (
            <div className="mt-[20px] flex flex-col items-center">
              <IntegrationContext.Provider
                value={{
                  date,
                  value: editInPlace ? InPlaceValue : props.value,
                  integration,
                }}
              >
                {(editInPlace ? InPlaceValue : props.value)
                  .map((p) => p.content)
                  .join('').length ? (
                  <PreviewComponent />
                ) : (
                  <>No Content Yet</>
                )}
              </IntegrationContext.Provider>
            </div>
          )}
        </div>
      </FormProvider>
    );
  };
};
