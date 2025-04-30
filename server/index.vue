<template>
  <div
    :class="[props.type === gameStatusEnum.ONGOING ? 'competition-content-ongoing' : 'competition-content-upcoming']"
  >
    <p :class="['en-title-font', props.styleFlag ? 'title-has-ongoing' : 'title']" id="title">{{ title }}</p>
    <div class="competition-card">
      <template v-if="ajaxRequest">
        <swiper-container
          v-if="competitionList.length > 1"
          class="competition-swiper-container"
          slides-per-view="auto"
          :spaceBetween="spaceMargin"
          :allow-touch-move="true"
          :grab-cursor="true"
          :observer="true"
          :observe-parents="true"
        >
          <swiper-slide
            class="competition-swiper-slide"
            v-for="(item, index) in competitionList"
            :key="index"
            @click="handleClick(item)"
          >
            <div class="flex flex-col card">
              <div class="flex items-center header-card">
                <div class="flex align-center header-card-left">
                  <el-image :src="item.gameLogo" class="play-logo" />
                  <!-- <p class="en-title-font play-name">{{ item.gameName }}</p> -->
                </div>
                <p class="time">{{ formatDateTime(Number(item?.matchStartTime)) }}</p>
              </div>
              <div class="flex card-content">
                <!-- 对战类型 -->
                <template v-if="item.gameType === gameTypeEnum.MATCH">
                  <div class="flex-col flex-center card-content-left">
                    <el-image :src="item.playerIconA || defaultAvatar" class="logo" fit="cover" />
                    <p class="text-center">{{ item.playerNameA }}</p>
                  </div>
                  <div class="flex card-content-center" :class="{ 'justify-between': type === gameStatusEnum.ONGOING }">
                    <!-- ONGoing -->
                    <p>
                      {{ item.playerScoreB }}
                    </p>
                    <p class="text-center">:</p>
                    <p>
                      {{ item.playerScoreA }}
                    </p>
                    <!-- UPCOMING -->
                    <!-- <i class="iconfont PK" v-else /> -->
                    <!-- <i class="iconfont PK" v-else /> -->
                  </div>
                  <div class="flex-col flex-center card-content-left">
                    <el-image :src="item.playerIconB || defaultAvatar" class="logo" fit="cover" />
                    <p class="text-center">{{ item.playerNameB }}</p>
                  </div>
                </template>
                <!-- 非对战类型 -->
                <p v-else class="unMatchName">{{ item.matchName }}</p>
              </div>
            </div>
          </swiper-slide>
        </swiper-container>
        <div class="null-data" v-else>
          <el-empty :image="emptyGameIcon" :image-size="200" description="The game is coming" />
        </div>
      </template>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { gameTypeEnum, gameStatusEnum } from "#/enum";
import emptyGameIcon from "@/assets/images/home/empty-game.png";
import { AclScheduleMatchListResp } from "@/api/home/types/index";
import { useI18n } from "vue-i18n";
import router from "@/router";
import { usePxToVw } from "@/hooks/use-px-to-vw";
import { formatDateTime } from "@/utils";
import defaultAvatar from "@/assets/images/common/default-avatar.png";

const { t } = useI18n();

interface Props {
  type?: gameStatusEnum;
  list?: AclScheduleMatchListResp[];
  ajaxRequest: boolean;
  styleFlag?: boolean;
}
const props = withDefaults(defineProps<Props>(), {
  list: () => [],
  styleFlag: false,
  ajaxRequest: false
});

const { zoom } = usePxToVw([], 0);

// 列表首项添加空白卡片，实现占位效果
const competitionList = computed(() => {
  const data = [{} as AclScheduleMatchListResp, ...props.list];
  // console.log("data", data);
  return data;
});
const title = computed(() => (props.type === gameStatusEnum.ONGOING ? t("home.ongoing") : t("home.upcoming")));

// 第一张空白卡片的宽度
const distance = ref();
const initSpaceBetween = 24; //在1920px屏幕宽度下滑块之间的间距
const initDeviceWidth = window.innerWidth;

// 在当前屏幕下（不是windowWidth值【1920】），获取第一张空白卡片宽度，再转化宽度值px为vw
const getFirstWidth = () => {
  const num = (initDeviceWidth - document.querySelector("#title")!.clientWidth) / 2;
  return ((num - initSpaceBetween * zoom.value) * 100) / initDeviceWidth + "vw";
};
const spaceMargin = computed(() => {
  return initSpaceBetween * zoom.value;
});
// 双击slider,跳转到游戏详情页
const handleClick = (item) => {
  router.push({ path: "/game-homepage", query: { id: item.projectId } });
};
onMounted(() => {
  nextTick(() => {
    distance.value = getFirstWidth();
  });
});
</script>

<style scoped lang="scss">
@use "@/styles/mixins.scss";
.title {
  margin: -170px auto 50px;
  max-width: 1200px;
  @include home-title(left, 0 0 0 0);
}
.title-has-ongoing {
  margin: auto;
  max-width: 1200px;
  @include home-title(left, 0 0 0 0);
}
.competition-content-ongoing {
  .competition-card {
    :deep(.el-empty__description) {
      margin-top: 24px;
      p {
        line-height: 30px;
        text-align: center;
        font-weight: 500;
        font-size: 26px;
        color: var(--text-color-black);
      }
    }
    .competition-swiper-container {
      margin: auto;
      .competition-swiper-slide {
        width: 380px;
        height: 353px;
        &:first-child {
          width: v-bind(distance);
          opacity: 0;
        }
        .card {
          width: 100%;
          height: 253px;
          //background: #f8f8f8;
          &:hover {
            border-top-right-radius: 30px;
            box-shadow: 3px 5px 12px 0 rgba(0, 0, 0, 0.16);
            .header-card {
              background-image: url("@/assets/images/home/competition-header-hover.png");
            }
          }
          .header-card {
            justify-content: space-between;
            box-sizing: border-box;
            padding: 0 24px 0 42px;
            height: 70px;
            background-color: transparent;
            background-image: url("@/assets/images/home/competition-header.png");
            background-size: cover;
            &-left {
              .play-logo {
                margin-right: 5px;
                width: 84px;
                max-height: 50px;
              }
              // .play-name {
              //  width: 150px;
              // line-height: 36px;
              //  font-weight: 400;
              //  font-size: 32px;
              // color: var(--text-color-black);
              //  word-break: break-all;
              // @include ellipsis;
              //}
            }
            .time {
              line-height: 20px;
              font-weight: 400;
              font-size: 20px;
              color: rgba(255, 255, 255, 0.5);
            }
          }
          .card-content {
            justify-content: space-between;
            flex: 1;
            height: 183px;
            background: #f8f8f8;
            &-left {
              width: 183px;
              .logo {
                margin-bottom: 15px;
                border-radius: 74px;
                width: 74px;
                height: 74px;
                & + p {
                  width: 90%;
                  line-height: 22px;
                  font-weight: 500;
                  font-size: 22px;
                  color: var(--text-color-black);
                  @include ellipsis;
                  word-break: break-all;
                }
              }
            }
            &-center {
              flex: 0;
              margin-top: 44px;
              p {
                flex-grow: 2;
                min-width: 41px;
                height: 59px;
                vertical-align: middle;
                text-align: center;
                font-weight: bold;
                font-size: 48px;
                &:nth-child(1) {
                  border-radius: 6px;
                  height: 59px;
                  background: #02795f;
                  line-height: 67px;
                  color: #fff;
                }
                &:nth-child(2) {
                  flex-grow: 1;
                  line-height: 59px;
                  text-align: center;
                  color: #02795f;
                }
                &:nth-child(3) {
                  border-radius: 6px;
                  height: 59px;
                  background: #02795f;
                  line-height: 67px;
                  text-align: center;
                  color: #fff;
                }
              }
              .PK {
                font-size: 37px;
                color: var(--theme-color);
              }
            }
            .unMatchName {
              position: relative;
              left: 50%;
              max-width: 92%;
              line-height: 34px;
              text-align: center;
              font-weight: 600;
              font-size: 28px;
              color: #010101;
              word-break: break-all;
              transform: translateX(-50%);
              @include ellipsis(4);
            }
          }
        }
      }
    }
  }
}
.competition-content-upcoming {
  .competition-card {
    :deep(.el-empty__description) {
      margin-top: 24px;
      p {
        line-height: 30px;
        text-align: center;
        font-weight: 500;
        font-size: 26px;
        color: var(--text-color-black);
      }
    }
    .competition-swiper-container {
      margin: auto;
      .competition-swiper-slide {
        width: 380px;
        height: 353px;
        &:first-child {
          width: v-bind(distance);
          opacity: 0;
        }
        .card {
          width: 100%;
          height: 253px;
          // background: #f8f8f8;
          &:hover {
            border-top-right-radius: 30px;
            box-shadow: 3px 5px 12px 0 rgba(0, 0, 0, 0.16);
            .header-card {
              background-image: url("@/assets/images/home/competition-header-hover.png");
            }
          }
          .header-card {
            justify-content: space-between;
            box-sizing: border-box;
            padding: 0 24px 0 42px;
            height: 70px;
            background-image: url("@/assets/images/home/competition-header.png");
            background-size: cover;
            &-left {
              .play-logo {
                margin-right: 5px;
                width: 84px;
                max-height: 50px;
              }
              // .play-name {
              //  width: 150px;
              //  line-height: 36px;
              //  font-weight: 400;
              //  font-size: 32px;
              //  color: var(--text-color-black);
              //  word-break: break-all;
              //  @include ellipsis;
              // }
            }
            .time {
              line-height: 20px;
              font-weight: 400;
              font-size: 20px;
              color: rgba(0, 0, 0, 0.5);
            }
          }
          .card-content {
            justify-content: space-between;
            flex: 1;
            height: 183px;
            background: #f8f8f8;
            &-left {
              width: 183px;
              .logo {
                margin-bottom: 15px;
                border-radius: 74px;
                width: 74px;
                height: 74px;
                & + p {
                  width: 90%;
                  line-height: 26px;
                  font-weight: 400;
                  font-size: 22px;
                  color: var(--text-color-black);
                  @include ellipsis;
                  word-break: break-all;
                }
              }
            }
            &-center {
              flex: 0;
              margin-top: 44px;
              p {
                flex-grow: 2;
                min-width: 41px;
                height: 59px;
                vertical-align: middle;
                text-align: center;
                font-weight: bold;
                font-size: 48px;
                &:nth-child(1) {
                  border-radius: 6px;
                  height: 59px;
                  background: #b1b1b1;
                  line-height: 67px;
                  color: #fff;
                }
                &:nth-child(2) {
                  flex-grow: 1;
                  line-height: 59px;
                  text-align: center;
                  color: #b1b1b1;
                }
                &:nth-child(3) {
                  border-radius: 6px;
                  height: 59px;
                  background: #b1b1b1;
                  line-height: 67px;
                  text-align: center;
                  color: #fff;
                }
              }
              .PK {
                font-size: 37px;
                color: var(--theme-color);
              }
            }
            .unMatchName {
              position: relative;
              left: 50%;
              max-width: 92%;
              line-height: 34px;
              text-align: center;
              font-weight: 600;
              font-size: 28px;
              color: #010101;
              word-break: break-all;
              transform: translateX(-50%);
              @include ellipsis(4);
            }
          }
        }
      }
    }
  }
}
</style>
