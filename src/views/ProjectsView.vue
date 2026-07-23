
<template>
  <section class="portfolio-section">
    <div class="portfolio-container">
      <!-- Left Content Block -->
      <div class="portfolio-content">
        <h2 class="portfolio-title">OUR PORTFOLIO</h2>
        <p class="portfolio-text">
          Multi-family is our passion, and we're committed to taking our business to the next level. Our portfolio is currently comprised of over 12,000 apartment homes in the Southeast region of the US, and we are now on a mission to double in size over the next ten years. Follow our journey to 10K.
        </p>
        <Button label="OUR PORTFOLIO" outlined class="portfolio-button" />
      </div>

      <!-- Right Image Carousel -->
      <div class="portfolio-carousel-wrapper">
        <Carousel
          :value="portfolioImages"
          :numVisible="3"
          :numScroll="1"
          :responsiveOptions="responsiveOptions"
          :showIndicators="false"
          :showNavigators="true"
          :circular="true"
          :autoplayInterval="5000"
          verticalViewPortHeight="500px"
          class="portfolio-carousel"
        >
          <template #item="slotProps">
            <div class="carousel-item">
              <img
                :src="slotProps.data.image"
                :alt="slotProps.data.name"
                class="carousel-image"
              />
              <div class="carousel-caption">{{ slotProps.data.name }}</div>
            </div>
          </template>
        </Carousel>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import Button from 'primevue/button';
import Carousel from 'primevue/carousel';

const portfolioImages = ref([
  {
    name: 'PROPERTY ONE',
    image: 'https://via.placeholder.com/300x400?text=Property1'
  },
  {
    name: 'CANTERBURY CIRCLE',
    image: 'https://via.placeholder.com/500x300?text=Canterbury+Circle'
  },
  {
    name: 'PROPERTY THREE',
    image: 'https://via.placeholder.com/300x400?text=Property3'
  }
]);

const responsiveOptions = ref([
  {
    breakpoint: '1400px',
    numVisible: 2,
    numScroll: 1
  },
  {
    breakpoint: '1199px',
    numVisible: 2,
    numScroll: 1
  },
  {
    breakpoint: '767px',
    numVisible: 1,
    numScroll: 1
  }
]);
</script>

<style scoped>
.portfolio-section {
  padding: 60px 40px;
  background-color: #f9f7f4;
}

.portfolio-container {
  display: flex;
  gap: 60px;
  align-items: center;
  max-width: 1400px;
  margin: 0 auto;
}

.portfolio-content {
  flex: 0 0 40%;
}

.portfolio-title {
  font-size: 36px;
  font-weight: 600;
  color: #997766;
  margin-bottom: 24px;
  text-transform: uppercase;
  letter-spacing: 2px;
}

.portfolio-text {
  font-size: 16px;
  line-height: 1.6;
  color: #555;
  margin-bottom: 32px;
}

.portfolio-button {
  border-color: #997766;
  color: #997766;
}

.portfolio-button:hover {
  background-color: #f5f5f5;
}

.portfolio-carousel-wrapper {
  flex: 1;
}

.portfolio-carousel {
  width: 100%;
}

.carousel-item {
  position: relative;
  overflow: hidden;
  border-radius: 4px;
}

.carousel-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.carousel-caption {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background-color: rgba(0, 0, 0, 0.6);
  color: white;
  padding: 12px;
  text-align: center;
  font-size: 14px;
  font-weight: 500;
}

@media (max-width: 1024px) {
  .portfolio-container {
    flex-direction: column;
    gap: 40px;
  }

  .portfolio-content {
    flex: 1 1 100%;
  }

  .portfolio-carousel-wrapper {
    flex: 1 1 100%;
  }
}
</style>
