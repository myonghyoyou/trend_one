package com.trendone.govtrend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.mybatis.spring.annotation.MapperScan;

@SpringBootApplication
@MapperScan("com.trendone.govtrend.dao")
public class GovTrendApplication {

    public static void main(String[] args) {
        SpringApplication.run(GovTrendApplication.class, args);
    }
}
