<template>
  <div class="wrapper" :class="{ disabled: disabled }">
    <Card>
      <template v-slot:header>
        <div style="position: relative">
          <div class="open-link">
            <i
              class="pi pi-external-link"
              @click="
                openLink(
                  `${constants().api}/storage/${asset.file.key}?box=true${asset.token ? `&token=${asset.token}` : ''}`,
                )
              "
            ></i>
          </div>
          <div class="selected-overlay" :class="{ selected: selected }"></div>
          <div v-for="detector in results" :key="detector">
            <div
              v-if="detector.box !== undefined && loaded"
              :class="'box ' + detector.detector"
              :style="box(detector.box)"
            ></div>
          </div>
          <div v-if="selectedDetector" class="asset-result p-p-2">
            <pre>{{ { ...selectedDetector.result, createdAt: formatTime(asset.createdAt), updatedAt: asset.updatedAt ? formatTime(asset.updatedAt) : asset.updatedAt} }}</pre>
          </div>

          <div class="ratio" :style="{ paddingTop: (asset.file.height / asset.file.width) * 100 + '%' }">
            <div v-if="!loaded" style="position: absolute; top: 50%; left: 50%; margin-left: -0.75rem">
              <i class="pi pi-spin pi-spinner" style="font-size: 1.5rem"></i>
            </div>
            <VLazyImage
              ref="thumbnail"
              @click="emitter.emit('toggleAsset', asset)"
              :class="loaded ? 'thumbnail' : 'thumbnail lazy'"
              :src="imageURL()"
              :onload="assetLoaded"
              :style="{ position: asset.file.width === 0 || asset.file.height === 0 ? 'relative' : 'absolute' }"
            />
          </div>
        </div>
      </template>
      <template v-slot:content>
        <div v-if="type === 'match'">
          <DataTable :value="results" class="p-datatable-sm" responsiveLayout="scroll">
            <Column header="Detector">
              <template v-slot:body="slotProps">
                <div class="p-d-block" style="position: relative">
                  <Badge
                    :value="slotProps.data.detector"
                    :severity="slotProps.data.match ? 'success' : 'danger'"
                    class="clickable"
                    style="padding-right: 18px"
                    :class="{ selected: selectedDetector?.index === slotProps.index }"
                    @click="
                      selectedDetector =
                        selectedDetector?.index === slotProps.index
                          ? null
                          : { index: slotProps.index, result: slotProps.data }
                    "
                  />
                  <div :class="'icon ' + slotProps.data.detector"></div>
                </div>
              </template>
            </Column>
            <Column field="name" header="Name"></Column>
            <Column header="%">
              <template v-slot:body="slotProps">
                <div
                  v-if="getCheckValue('confidence', slotProps.data.checks)"
                  class="check-miss p-d-inline-block"
                  v-tooltip.right="getCheckValue('confidence', slotProps.data.checks)"
                >
                  {{ slotProps.data.confidence }}
                </div>
                <div v-else>{{ slotProps.data.confidence || '-' }}</div>
              </template>
            </Column>
            <Column header="Box">
              <template v-slot:body="slotProps">
                <div
                  v-if="getCheckValue('box area', slotProps.data.checks)"
                  class="check-miss p-d-inline-block"
                  v-tooltip.right="getCheckValue('box area', slotProps.data.checks)"
                >
                  {{ slotProps.data.box.width }}x{{ slotProps.data.box.height }}
                </div>
                <div v-else>{{ slotProps.data.box.width }}x{{ slotProps.data.box.height }}</div>
              </template>
            </Column>
          </DataTable>
        </div>
        <div v-if="type === 'train' && asset.results.length">
          <div v-for="(detection, index) in asset.results" :key="detection" class="p-d-inline-block badge-holder">
            <Badge
              :value="detection.detector"
              :severity="
                detection.result?.status
                  ? detection.result.status.toString().charAt(0) === '2'
                    ? 'success'
                    : 'danger'
                  : ''
              "
              class="clickable"
              :class="{ selected: selectedDetector?.index === index }"
              @click="selectedDetector = selectedDetector?.index === index ? null : { index, result: detection }"
            />
          </div>
        </div>
        <div v-else-if="type === 'train'">
          <Badge value="untrained" severity="danger" class="p-mb-3" />
          <br />
          <Dropdown v-model="folder" :options="folders" placeholder="move and train" :showClear="true" />
        </div>
      </template>
      <template v-slot:footer>
        <div style="position: relative">
          <div class="p-d-flex p-jc-between p-ai-center">
            <div v-if="type === 'match'" class="p-mb-3">
              <Badge v-if="asset.isTrained" value="trained" severity="success" />
              <Badge v-if="asset.camera" :value="asset.camera" />
              <Badge v-if="asset.type && asset.type !== 'manual'" :value="asset.type" />
              <Badge v-if="asset.zones.length" :value="[...asset.zones].join(', ')" />
              <div v-for="gender in genders" :key="gender" class="badge-holder p-d-inline-block">
                <Badge :value="gender.value + ': ' + gender.probability + '%'" />
              </div>
              <div v-for="age in ages" :key="age" class="badge-holder p-d-inline-block">
                <Badge :value="age.low + '-' + age.high + ': ' + age.probability + '%'" />
              </div>
              <div v-for="mask in masks" :key="mask" class="badge-holder p-d-inline-block">
                <Badge :value="mask.value.replace(/_/g, ' ') + ': ' + mask.probability + '%'" />
              </div>
            </div>
          </div>
          <div class="p-d-block" style="width: calc(100% - 40px)">
            <small v-if="type === 'match'" v-tooltip.right="formatTime(asset.createdAt)" style="cursor: pointer">{{
              createdAt.ago
            }}</small>
            <small
              v-if="type === 'match' && updatedAt"
              class="p-ml-2"
              v-tooltip.right="formatTime(asset.updatedAt)"
              style="cursor: pointer"
            >
              {{ updatedAt ? `(updated ${updatedAt.ago})` : '' }}
            </small>
            <small v-if="type === 'train'">{{ asset.name }}</small>
          </div>
          <Button
            v-if="type === 'match'"
            :icon="reprocessing ? 'pi pi-spin pi-spinner' : 'pi pi-refresh'"
            class="reprocess-btn p-button-sm"
            @click="reprocess"
            v-tooltip.right="'Reprocess Image'"
          />
        </div>
      </template>
    </Card>
  </div>
</template>

<script>
import VLazyImage from 'v-lazy-image';

import Button from 'primevue/button';
import Badge from 'primevue/badge';
import Card from 'primevue/card';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Dropdown from 'primevue/dropdown';

import Time from '@/util/time.util';
import Constants from '@/util/constants.util';
import ApiService from '@/services/api.service';

export default {
  props: {
    asset: Object,
    loaded: Boolean,
    selected: Boolean,
    disabled: Boolean,
    type: String,
    folders: Array,
    index: Number,
  },
  components: {
    Badge,
    Card,
    DataTable,
    Column,
    Dropdown,
    Button,
    VLazyImage,
  },
  data: () => ({
    timestamp: Date.now(),
    folder: null,
    loadedCount: 0,
    reprocessing: false,
    selectedDetector: null,
    src: null,
  }),
  created() {
    setInterval(() => {
      this.timestamp = Date.now();
    }, 1000);
  },
  methods: {
    constants: () => ({
      ...Constants(),
    }),
    formatTime: (ISO) => Time.format(ISO),
    agoTime: (ISO) => Time.ago(ISO),
    imageURL() {
      return `${this.constants().api}/storage/${this.asset.file.key}?thumb${
        this.asset.token ? `&token=${this.asset.token}` : ''
      }`;
    },
    assetLoaded() {
      this.emitter.emit('assetLoaded', this.asset.id);
    },
    openLink(url) {
      window.open(url);
    },
    box(obj) {
      const { width, height } = this.asset.file;
      const values = {
        top: obj.width ? `${(obj.top / height) * 100}%` : 0,
        width: obj.width ? `${(obj.width / width) * 100}%` : 0,
        height: obj.width ? `${(obj.height / height) * 100}%` : 0,
        left: obj.width ? `${(obj.left / width) * 100}%` : 0,
      };

      return `width: ${values.width}; height: ${values.height}; top: ${values.top}; left: ${values.left}`;
    },
    getCheckValue(type, checks) {
      if (!checks) return false;
      return checks.find((check) => check.includes(type));
    },
    async reprocess() {
      try {
        this.reprocessing = true;
        const { data } = await ApiService.patch(`match/reprocess/${this.asset.id}`);
        this.emitter.emit('reprocess', data);
        this.reprocessing = false;
      } catch (error) {
        this.reprocessing = false;
        this.emitter.emit('error', error);
      }
    },
  },
  computed: {
    results() {
      let data = [];
      if (Array.isArray(this.asset.response)) {
        this.asset.response.forEach((result) => {
          const results = result.results.map((obj) => ({
            detector: result.detector,
            duration: result.duration,
            ...obj,
          }));
          data = data.concat(results);
        });
      }
      return data;
    },
    masks() {
      const masks = [];
      this.results.forEach((obj) => {
        if (obj.mask) masks.push({ ...obj.mask });
      });
      return masks;
    },
    genders() {
      const genders = [];
      this.results.forEach((obj) => {
        if (obj.gender) genders.push({ ...obj.gender });
      });
      return genders;
    },
    ages() {
      const ages = [];
      this.results.forEach((obj) => {
        if (obj.age) ages.push({ ...obj.age });
      });
      return ages;
    },
    createdAt() {
      return { ago: this.agoTime(this.asset.createdAt), timestamp: this.timestamp };
    },
    updatedAt() {
      if (!this.asset.updatedAt) return null;
      return { ago: this.agoTime(this.asset.updatedAt), timestamp: this.timestamp };
    },
  },
  watch: {
    folder(value) {
      if (value) {
        const { id } = this.asset;
        ApiService.patch(`train/${id}`, { name: value });
        this.emitter.emit('realoadTrain');
      }
    },
  },
};
</script>

<style scoped lang="scss">
::v-deep(.p-datatable-table) {
  font-size: 0.9rem;

  .p-datatable-thead > tr > th {
    border-top: 0;
  }

  .check-miss {
    color: #f19ea6;
    font-weight: bold;
    cursor: pointer;
  }

  td {
    position: relative;
  }

  .icon {
    width: 10px;
    height: 10px;
    display: inline-block;
    border-radius: 100%;
    position: absolute;
    top: 50%;
    margin-top: -5px;
    margin-left: -15px;
    background: #78cc86;
  }
  .icon.compreface {
    background: var(--blue-600);
  }
  .icon.deepstack {
    background: var(--orange-600);
  }
  .icon.aiserver {
    background: var(--orange-600);
  }
  .icon.facebox {
    background: var(--indigo-600);
  }
  .icon.handgesture {
    background: var(--pink-600);
  }

}

.p-badge.clickable {
  cursor: pointer;
  margin-right: 0;

  &:hover,
  &.selected {
    opacity: 0.8;
  }
}

.asset-result {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  color: var(--gray-200);
  background: rgba(32, 38, 46, 0.85);
  z-index: 2;
  overflow-y: auto;

  pre {
    font-size: 0.85rem;
    margin: 0;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}

.open-link {
  position: absolute;
  top: 0;
  right: 0;
  cursor: pointer;
  padding: 0.5rem;
  z-index: 2;
}

.wrapper {
  transition: opacity 0.5s;

  &.disabled {
    opacity: 0.2;

    img.thumbnail {
      cursor: not-allowed;
    }
  }
}

.ratio {
  position: relative;
}

img.thumbnail {
  width: 100%;
  display: block;
  cursor: pointer;
  transition: opacity 0.5s;
  opacity: 1;
  top: 0;
  left: 0;

  &.lazy {
    opacity: 0;
  }
}

.badge-holder {
  margin-right: 5px;
  margin-bottom: 5px;
  &:last-child {
    margin-right: 0;
  }
}
.p-badge {
  flex: 1 1 auto;
  margin-right: 5px;
  &:last-child {
    margin-right: 0;
  }
}

.selected-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border: 4px solid #78cc86;
  z-index: 2;
  display: none;
  pointer-events: none;

  &.selected {
    display: block;
  }
}

.box {
  z-index: 1;
  position: absolute;
  border: 2px solid;
  pointer-events: none;
  border-color: #78cc86;
}

.box.compreface {
  border-color: var(--blue-600);
}
.box.deepstack {
  border-color: var(--orange-600);
}
.box.aiserver {
  border-color: var(--orange-600);
}
.box.facebox {
  border-color: var(--indigo-600);
}
.box.handgesture {
  border-color: var(--pink-600);
}

.p-card {
  ::v-deep(.p-card-content) {
    padding-top: 0;
    padding-bottom: 0;
  }
  ::v-deep(.p-card-body) {
    @media only screen and (max-width: 576px) {
      padding: 0.75rem;
    }
  }
}

.reprocess-btn {
  position: absolute;
  bottom: 0;
  right: 0;
}
</style>
