package com.watermeloncup.draftengine;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class DraftEngineApplication {

    public static void main(String[] args) {
        SpringApplication.run(DraftEngineApplication.class, args);
    }

}
